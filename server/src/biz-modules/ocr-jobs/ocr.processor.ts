import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as fs from 'fs';
import axios from 'axios';
import { extname } from 'path';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { LocalStorageProvider } from '@core/storage/local-storage.provider';
import { QueueName } from '@core/types/queue-name.enum';
import { OcrProvider } from '@core/types/ocr-provider.enum';
import { MimeType } from '@open-receipt-ocr/types';

import { OcrExecutionsDao } from '@core/database/daos/ocr-executions.dao';
import { OcrFilesDao } from '@core/database/daos/ocr-files.dao';
import { OcrJobsDao } from '@core/database/daos/ocr-jobs.dao';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';
import { OcrExecutionStatus, OcrFileStatus, OcrJobStatus } from '@open-receipt-ocr/types';

@Processor(QueueName.Ocr)
export class OcrProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(
    private readonly ocrExecutionsDao: OcrExecutionsDao,
    private readonly ocrFilesDao: OcrFilesDao,
    private readonly ocrJobsDao: OcrJobsDao,
    @Inject(SecretProvider) private readonly secretProvider: SecretProvider,
    private readonly localStorage: LocalStorageProvider,
  ) {
    super();
  }

  async process(job: Job<{ executionId: number }>): Promise<void> {
    const { executionId } = job.data;
    this.logger.log(`Processing OCR for execution #${executionId}`);

    const execution = await this.ocrExecutionsDao.getOneByPk(executionId);
    if (!execution) {
      this.logger.error(`Execution #${executionId} not found — skipping`);
      return;
    }

    const file = await this.ocrFilesDao.getOneByPk(execution.fileId);
    if (!file) {
      this.logger.error(`File #${execution.fileId} for execution #${executionId} not found — skipping`);
      return;
    }

    try {
      await this.ocrExecutionsDao.updateByPk(executionId, { status: OcrExecutionStatus.Running });
      await this.ocrFilesDao.updateByPk(file.id, { status: OcrFileStatus.Processing });

      const filePath = this.localStorage.getFilePath(file.filename);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found on disk: ${filePath}`);
      }

      let ocrData: string;

      switch (execution.ocrProvider) {
        case OcrProvider.Mistral:
          ocrData = await this.processMistral(file, executionId, filePath);
          break;
        case OcrProvider.Azure:
        case OcrProvider.Aws:
          throw new Error(`OCR Provider "${execution.ocrProvider}" is not yet implemented.`);
        default:
          throw new Error(`Unknown OCR Provider: ${execution.ocrProvider}`);
      }

      await this.ocrExecutionsDao.updateByPk(executionId, {
        status: OcrExecutionStatus.Completed,
        ocrData,
      });

      await this.ocrFilesDao.updateByPk(file.id, {
        status: OcrFileStatus.Completed,
      });

      // Update Job status to Completed if all files are completed
      const job = await this.ocrJobsDao.findOneWithRelations(file.jobId);
      if (job && job.files.every((f) => f.status === OcrFileStatus.Completed)) {
        await this.ocrJobsDao.updateByPk(job.id, { status: OcrJobStatus.Completed });
      }

      this.logger.log(`Successfully completed OCR for execution #${executionId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`OCR failed for execution #${executionId}: ${message}`);

      await this.ocrExecutionsDao.updateByPk(executionId, {
        status: OcrExecutionStatus.Failed,
        errorMessage: message,
      });

      await this.ocrFilesDao.updateByPk(file.id, {
        status: OcrFileStatus.Failed,
      });

      await this.ocrJobsDao.updateByPk(file.jobId, { status: OcrJobStatus.Failed });

      throw error;
    }
  }

  private async processMistral(file: OcrFileEntity, executionId: number, filePath: string): Promise<string> {
    const mistralApiKey = await this.secretProvider.getSecretOrThrow(AppSecret.MistralApiKey);
    // TODO: Use storage instead. The file might not be stored in local storage
    const base64Content = fs.readFileSync(filePath).toString('base64');
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

  private static getMimeType(ext: string): string {
    switch (ext) {
      case '.pdf':
        return MimeType.Pdf;
      case '.jpg':
      case '.jpeg':
        return MimeType.Jpeg;
      case '.png':
        return MimeType.Png;
      default:
        return MimeType.OctetStream;
    }
  }
}
