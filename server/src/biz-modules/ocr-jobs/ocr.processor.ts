import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import axios from 'axios';
import { extname } from 'path';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { QueueName } from '@core/types/queue-name.enum';
import { OcrProvider } from '@core/types/ocr-provider.enum';
import { MimeType, FileExtension } from '@open-receipt-ocr/types';

import { OcrExecutionsDao } from '@core/database/daos/ocr-executions.dao';
import { OcrFilesDao } from '@core/database/daos/ocr-files.dao';
import { OcrJobsDao } from '@core/database/daos/ocr-jobs.dao';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';
import { OcrExecutionStatus, OcrFileStatus, OcrJobStatus } from '@open-receipt-ocr/types';
import { NoTxn, WithTxn } from '@core/database/txn-def.interface';
import { DbService } from '@core/database/db.service';

@Processor(QueueName.Ocr)
export class OcrProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(
    private readonly ocrExecutionsDao: OcrExecutionsDao,
    private readonly ocrFilesDao: OcrFilesDao,
    private readonly ocrJobsDao: OcrJobsDao,
    @Inject(SecretProvider) private readonly secretProvider: SecretProvider,
    private readonly storage: StorageProvider,
    private readonly db: DbService,
  ) {
    super();
  }

  async process(job: Job<{ executionId: number }>): Promise<void> {
    const { executionId } = job.data;
    this.logger.log(`Processing OCR for execution #${executionId}`);

    const execution = await this.ocrExecutionsDao.getOneByPk(NoTxn, executionId);
    if (!execution) {
      this.logger.error(`Execution #${executionId} not found — skipping`);
      return;
    }

    const file = await this.ocrFilesDao.getOneByPk(NoTxn, execution.fileId);
    if (!file) {
      this.logger.error(`File #${execution.fileId} for execution #${executionId} not found — skipping`);
      return;
    }

    try {
      await this.db.transaction(async (em) => {
        const txn = WithTxn(em);

        await this.ocrExecutionsDao.updateByPk(txn, executionId, { status: OcrExecutionStatus.Running });
        await this.ocrFilesDao.updateByPk(txn, file.id, { status: OcrFileStatus.Processing });
      });

      const fileExists = await this.storage.exists(file.filename);
      if (!fileExists) {
        throw new Error(`File not found in storage: ${file.filename}`);
      }

      let ocrData: string;

      switch (execution.ocrProvider) {
        case OcrProvider.Mistral:
          ocrData = await this.processMistral(file, executionId);
          break;
        case OcrProvider.Azure:
        case OcrProvider.Aws:
          throw new Error(`OCR Provider "${execution.ocrProvider}" is not yet implemented.`);
        default:
          throw new Error(`Unknown OCR Provider: ${execution.ocrProvider}`);
      }

      await this.db.transaction(async (em) => {
        const txn = WithTxn(em);

        await this.ocrExecutionsDao.updateByPk(txn, executionId, {
          status: OcrExecutionStatus.Completed,
          ocrData,
        });

        await this.ocrFilesDao.updateByPk(txn, file.id, {
          status: OcrFileStatus.Completed,
        });

        // Update Job status to Completed if all files are completed
        const job = await this.ocrJobsDao.findOneWithRelations(txn, file.jobId);
        if (job && job.files.every((f) => f.status === OcrFileStatus.Completed)) {
          await this.ocrJobsDao.updateByPk(txn, job.id, { status: OcrJobStatus.Completed });
        }
      });

      this.logger.log(`Successfully completed OCR for execution #${executionId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`OCR failed for execution #${executionId}: ${message}`);

      await this.db.transaction(async (em) => {
        const txn = WithTxn(em);

        await this.ocrExecutionsDao.updateByPk(txn, executionId, {
          status: OcrExecutionStatus.Failed,
          errorMessage: message,
        });

        await this.ocrFilesDao.updateByPk(txn, file.id, {
          status: OcrFileStatus.Failed,
        });

        await this.ocrJobsDao.updateByPk(txn, file.jobId, { status: OcrJobStatus.Failed });
      });

      throw error;
    }
  }

  private async processMistral(file: OcrFileEntity, executionId: number): Promise<string> {
    const mistralApiKey = await this.secretProvider.getSecretOrThrow(AppSecret.MistralApiKey);
    
    const fileStream = await this.storage.getStream(file.filename);
    const base64Content = await this.streamToBase64(fileStream);
    const mimeType = OcrProcessor.getMimeType(extname(file.filename).toLowerCase());

    this.logger.log(`Calling Mistral OCR API for execution #${executionId}`);

    const response = await axios.post(
      'https://api.mistral.ai/v1/ocr',
      {
        model: 'mistral-ocr-latest',
        document: {
          type: 'document_content',
          document_content: base64Content,
          document_media_type: mimeType,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${mistralApiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return JSON.stringify(response.data);
  }

  private streamToBase64(stream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer.toString('base64'));
      });
      stream.on('error', reject);
    });
  }

  private static getMimeType(ext: string): string {
    switch (ext) {
      case FileExtension.Pdf:
        return MimeType.Pdf;
      case FileExtension.Jpg:
      case FileExtension.Jpeg:
        return MimeType.Jpeg;
      case FileExtension.Png:
        return MimeType.Png;
      default:
        return MimeType.OctetStream;
    }
  }
}
