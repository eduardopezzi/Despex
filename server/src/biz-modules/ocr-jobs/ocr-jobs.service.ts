import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import type { Request } from 'express';
import { QueueService } from '@core/queue/queue.service';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { AppSecret } from '@core/types/app-secret.enum';
import { ALLOWED_MIME_TYPES, DEFAULT_MAX_FILE_SIZE_BYTES } from '@core/constants/media.constants';
import { parseMultipartStream } from '@core/utils/multipart.util';

import { OcrProvider } from '@core/types/ocr-provider.enum';

import { OcrJobsDao } from '@core/database/daos/ocr-jobs.dao';
import { OcrFilesDao } from '@core/database/daos/ocr-files.dao';
import { OcrExecutionsDao } from '@core/database/daos/ocr-executions.dao';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';
import { OcrExecutionEntity } from '@core/database/entities/ocr-execution.entity';
import { OcrExecutionStatus, OcrFileStatus, OcrJobStatus } from '@open-receipt-ocr/types';

@Injectable()
export class OcrJobsService {
  private readonly logger = new Logger(OcrJobsService.name);

  constructor(
    private readonly ocrJobsDao: OcrJobsDao,
    private readonly ocrFilesDao: OcrFilesDao,
    private readonly ocrExecutionsDao: OcrExecutionsDao,
    private readonly queueService: QueueService,
    private readonly secretProvider: SecretProvider,
    @Inject(StorageProvider) private readonly storage: StorageProvider,
  ) {}

  findAllJobs(): Promise<OcrJobEntity[]> {
    return this.ocrJobsDao.findAllWithRelations();
  }

  async upload(req: Request): Promise<OcrJobEntity> {
    const contentType = req.headers['content-type'];
    if (!contentType?.startsWith('multipart/form-data')) {
      throw new BadRequestException('Expected a multipart/form-data request.');
    }

    const maxSizeStr = await this.secretProvider.getSecret(AppSecret.MaxFileSizeBytes);
    const maxSizeBytes = maxSizeStr ? parseInt(maxSizeStr, 10) : DEFAULT_MAX_FILE_SIZE_BYTES;

    const parseResult = await parseMultipartStream(req, this.storage, {
      maxSizeBytes,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });

    const jobName = parseResult.fields['jobName'];

    const ocrJob = await this.ocrJobsDao.create({
      status: OcrJobStatus.Processing,
      name: jobName,
    });

    for (let i = 0; i < parseResult.files.length; i++) {
      const file = parseResult.files[i];
      let ocrProvider: OcrProvider = OcrProvider.Mistral;

      const providerField = `ocrProvider_${i}`;
      if (parseResult.fields[providerField] && Object.values(OcrProvider).includes(parseResult.fields[providerField] as OcrProvider)) {
        ocrProvider = parseResult.fields[providerField] as OcrProvider;
      }

      const ocrFile = await this.ocrFilesDao.create({
        jobId: ocrJob.id,
        filename: file.key,
        originalName: file.originalName,
        status: OcrFileStatus.Processing,
      });

      const execution = await this.ocrExecutionsDao.create({
        fileId: ocrFile.id,
        ocrProvider,
        status: OcrExecutionStatus.Pending,
      });

      await this.queueService.addToOcrQueue({ executionId: execution.id });
      this.logger.log(`Execution #${execution.id} for File #${ocrFile.id} queued for OCR`);
    }

    return ocrJob;
  }

  async getJob(id: number): Promise<OcrJobEntity> {
    const job = await this.ocrJobsDao.findOneWithRelations(id);
    if (!job) {
      throw new BadRequestException(`OCR Job #${id} not found`);
    }
    return job;
  }

  async retry(fileId: number, ocrProvider: OcrProvider): Promise<OcrExecutionEntity> {
    const file = await this.ocrFilesDao.getOneByPkOrFail(fileId);

    const execution = await this.ocrExecutionsDao.create({
      fileId: file.id,
      ocrProvider,
      status: OcrExecutionStatus.Pending,
    });

    await this.ocrFilesDao.updateByPk(fileId, {
      status: OcrFileStatus.Processing,
    });

    await this.queueService.addToOcrQueue({ executionId: execution.id });
    this.logger.log(`New execution #${execution.id} for File #${fileId} queued for OCR (retry)`);
    return execution;
  }

  async getFileStream(key: string): Promise<Readable> {
    return this.storage.getStream(key);
  }

  async fileExists(key: string): Promise<boolean> {
    return this.storage.exists(key);
  }

  async deleteJob(id: number): Promise<void> {
    const job = await this.ocrJobsDao.findOneWithRelations(id);
    if (!job) return;

    for (const file of job.files) {
      try {
        await this.storage.delete(file.filename);
      } catch (err) {
        this.logger.error(`Failed to delete file ${file.filename}: ${(err as Error).message}`);
      }
    }

    await this.ocrJobsDao.deleteByPk(id);
    this.logger.log(`OCR Job #${id} and associated files deleted`);
  }
}
