import { INestApplication } from '@nestjs/common';
import { DatabaseModule } from '@core/database/database.module';
import { OcrJobsModule } from '@biz-modules/ocr-jobs/ocr-jobs.module';
import { StorageModule } from '@core/storage/storage.module';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestHelpers } from '@tests/test-helpers';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';
import { MimeType, OcrProvider, OcrJobStatus, OcrFileStatus, OcrExecutionStatus } from '@open-receipt-ocr/types';
import { MockQueueService, TestContextHelpers } from '@tests/test-context.helpers';
import { OcrFilesDao } from '@core/database/daos/ocr-files.dao';
import { NoTxn } from '@core/database/txn-def.interface';

describe('OCR Jobs Controller (e2e)', () => {
  let app: INestApplication;
  let queueServiceMock: MockQueueService;

  const fileData = 'test content';

  beforeAll(async () => {
    const context = await TestContextHelpers.createTestContext({
      imports: [DatabaseModule, StorageModule, OcrJobsModule],
    });
    app = context.app;
    queueServiceMock = context.mocks.queueService;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/ocr-jobs (GET)', async () => {
    const body = await TestHelpers.expectOk(app, '/ocr-jobs');
    expect(body).toEqual([]);
  });

  it('/ocr-jobs/upload (POST)', async () => {
    const body = await TestHelpers.expectUpload<{ id: number }>(
      app,
      '/ocr-jobs/upload',
      { ocrProvider_0: OcrProvider.Mistral, jobName: 'Test Job' },
      { name: 'file', filename: 'test.jpg', content: fileData, contentType: MimeType.Jpeg },
    );

    expect(body).toHaveProperty('id');
    expect(queueServiceMock.addToOcrQueue).toHaveBeenCalledOnce();
    // We can't easily check the execution ID here because it's auto-generated in DB
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    expect(queueServiceMock.addToOcrQueue).toHaveBeenCalledWith(expect.objectContaining({ executionId: expect.any(Number) }));
  });

  it('/ocr-jobs/:id (GET)', async () => {
    const uploadRes = await TestHelpers.expectUpload<{ id: number }>(
      app,
      '/ocr-jobs/upload',
      { ocrProvider_0: OcrProvider.Mistral, jobName: 'Detail Job' },
      { name: 'file', filename: 'detail.jpg', content: fileData, contentType: MimeType.Jpeg },
    );

    const id = uploadRes.id;
    const job = await TestHelpers.expectOk<OcrJobEntity>(app, `/ocr-jobs/${id}`);

    expect(job).toMatchObject({
      id: id,
      name: 'Detail Job',
      status: OcrJobStatus.Processing,
    });
    expect(job.files).toHaveLength(1);
    expect(job.files[0]).toMatchObject({
      originalName: 'detail.jpg',
      status: OcrFileStatus.Processing,
    });
  });

  it('/ocr-jobs/files/:fileId/reprocess (POST)', async () => {
    // 1. Create a job
    const uploadRes = await TestHelpers.expectUpload<{ id: number }>(
      app,
      '/ocr-jobs/upload',
      { ocrProvider_0: OcrProvider.Mistral, jobName: 'Retry Job' },
      { name: 'file', filename: 'retry-test.jpg', content: fileData, contentType: MimeType.Jpeg },
    );
    const jobId = uploadRes.id;

    // 2. Clear initial queue call
    queueServiceMock.addToOcrQueue.mockClear();

    // 3. Get the file ID
    const job = await TestHelpers.expectOk<OcrJobEntity>(app, `/ocr-jobs/${jobId}`);
    const fileId = job.files[0].id;

    // 4. Force failure state via DAO for testing
    const dao = app.get(OcrFilesDao);
    await dao.updateByPk(NoTxn, fileId, { status: OcrFileStatus.Failed });

    // 5. Call reprocess
    const reprocessRes = await TestHelpers.expectCreated<{ id: number; status: string }>(app, `/ocr-jobs/files/${fileId}/reprocess`, {
      ocrProvider: OcrProvider.Mistral,
    });

    expect(reprocessRes).toHaveProperty('id');
    expect(reprocessRes.status).toBe(OcrExecutionStatus.Pending);

    // 6. Verify queue was called again
    expect(queueServiceMock.addToOcrQueue).toHaveBeenCalledOnce();
    expect(queueServiceMock.addToOcrQueue).toHaveBeenCalledWith({ executionId: reprocessRes.id });

    // 7. Verify file status is processing again
    const updatedJob = await TestHelpers.expectOk<OcrJobEntity>(app, `/ocr-jobs/${jobId}`);
    expect(updatedJob.files[0].status).toBe(OcrFileStatus.Processing);
  });

  it('/ocr-jobs/:id (DELETE)', async () => {
    const uploadRes = await TestHelpers.expectUpload<{ id: number }>(
      app,
      '/ocr-jobs/upload',
      { ocrProvider_0: OcrProvider.Mistral, jobName: 'Delete Job' },
      { name: 'file', filename: 'delete-test.jpg', content: fileData, contentType: MimeType.Jpeg },
    );
    const id = uploadRes.id;

    await TestHelpers.expectOk(app, `/ocr-jobs/${id}`);
    await TestHelpers.expectDelete(app, `/ocr-jobs/${id}`);

    // TODO: OPR-3: Refactor test-helpers to make it generic (any type of endpoint GET/POST/DELETE)
    // await TestHelpers.expectBadRequest(app, `/ocr-jobs/${id}`);
  });
});
