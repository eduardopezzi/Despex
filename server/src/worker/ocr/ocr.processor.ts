import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { QueueName } from '@core/types/queue-name.enum';
import { OcrProvider } from '@core/types/ocr-provider.enum';

import { OcrExecutionsDao } from '@core/database/daos/ocr-executions.dao';
import { OcrFilesDao } from '@core/database/daos/ocr-files.dao';
import { OcrJobsDao } from '@core/database/daos/ocr-jobs.dao';
import { OcrExecutionStatus, OcrFileStatus, OcrJobStatus } from '@open-receipt-ocr/types';
import { NoTxn, WithTxn } from '@core/database/txn-def.interface';
import { DbService } from '@core/database/db.service';
import { MistralProcessor } from '@worker/ocr/mistral.processor';
import { TabScannerProcessor } from '@worker/ocr/tabscanner.processor';

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
    private readonly mistralProcessor: MistralProcessor,
    private readonly tabScannerProcessor: TabScannerProcessor,
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
          ocrData = await this.mistralProcessor.process(file, executionId);
          break;
        case OcrProvider.TabScanner:
          ocrData = await this.tabScannerProcessor.process(file, executionId);
          break;
        default:
          throw new Error(`OCR Provider "${execution.ocrProvider}" is not yet implemented.`);
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
}
