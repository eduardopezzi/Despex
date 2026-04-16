import { INestApplication } from '@nestjs/common';
import { DatabaseModule } from '@core/database/database.module';
import { OcrJobsModule } from '@app/ocr-jobs/ocr-jobs.module';
import { StorageModule } from '@core/storage/storage.module';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestHelpers } from '@tests/test-helpers';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';
import { MimeType, OcrProvider, OcrJobStatus, OcrFileStatus, OcrExecutionStatus, PaginatedResponse } from '@open-receipt-ocr/types';
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

  beforeEach(() => {
    queueServiceMock.addToOcrQueue.mockClear();
  });

  describe('/ocr-jobs GET', () => {
    it('/ocr-jobs (GET) - empty', async () => {
      const body = await TestHelpers.expectOk<PaginatedResponse<OcrJobEntity>>(app, '/ocr-jobs');
      expect(body.data).toBeArray();
      expect(body.data).toBeEmpty();
      expect(body.total).toBe(0);
    });

    it('/ocr-jobs (GET) - pagination and sorting', async () => {
      // 1. Create 3 jobs with a small delay or just ensure sequential
      const jobNames = ['Job A', 'Job B', 'Job C'];
      for (const name of jobNames) {
        await TestHelpers.expectUpload<{ id: number }>(
          app,
          '/ocr-jobs/upload',
          { ocrProvider_0: OcrProvider.Mistral, jobName: name },
          { name: 'file', filename: `${name.replace(' ', '')}.jpg`, content: fileData, contentType: MimeType.Jpeg },
        );
      }

      // 2. Fetch all - should be sorted by DESC (C, B, A)
      const all = await TestHelpers.expectOk<PaginatedResponse<OcrJobEntity>>(app, '/ocr-jobs');
      expect(all.total).toBe(3);
      expect(all.data).toBeArrayOfSize(3);
      expect(all.data[0].name).toBe('Job C');
      expect(all.data[1].name).toBe('Job B');
      expect(all.data[2].name).toBe('Job A');

      // 3. Fetch first page with size 2
      const page1 = await TestHelpers.expectOk<PaginatedResponse<OcrJobEntity>>(app, '/ocr-jobs?page=1&pageSize=2');
      expect(page1.total).toBe(3);
      expect(page1.data).toBeArrayOfSize(2);
      expect(page1.data[0].name).toBe('Job C');
      expect(page1.data[1].name).toBe('Job B');

      // 4. Fetch second page with size 2
      const page2 = await TestHelpers.expectOk<PaginatedResponse<OcrJobEntity>>(app, '/ocr-jobs?page=2&pageSize=2');
      expect(page2.total).toBe(3);
      expect(page2.data).toBeArrayOfSize(1);
      expect(page2.data[0].name).toBe('Job A');
    });

    it('/ocr-jobs (GET) - filter by status and search', async () => {
      // 1. Create a job with specific name and file
      await TestHelpers.expectUpload<{ id: number }>(
        app,
        '/ocr-jobs/upload',
        { ocrProvider_0: OcrProvider.Mistral, jobName: 'UniqueSearchableName' },
        { name: 'file', filename: 'unique-file-name.jpg', content: fileData, contentType: MimeType.Jpeg },
      );

      // 2. Search by job name
      const searchJob = await TestHelpers.expectOk<PaginatedResponse<OcrJobEntity>>(app, '/ocr-jobs?search=UniqueSearchableName');
      expect(searchJob.total).toBe(1);
      expect(searchJob.data[0].name).toBe('UniqueSearchableName');

      // 3. Search by file name
      const searchFile = await TestHelpers.expectOk<PaginatedResponse<OcrJobEntity>>(app, '/ocr-jobs?search=unique-file-name');
      expect(searchFile.total).toBe(1);
      expect(searchFile.data[0].name).toBe('UniqueSearchableName');

      // 4. Filter by status
      const statusResults = await TestHelpers.expectOk<PaginatedResponse<OcrJobEntity>>(app, `/ocr-jobs?status=${OcrJobStatus.Processing}`);
      expect(statusResults.data.every((j) => j.status === OcrJobStatus.Processing)).toBe(true);
    });

    it('/ocr-jobs (GET) - multi-column sorting', async () => {
      // 1. Create unique names to avoid conflicts with other tests
      await TestHelpers.expectUpload<{ id: number }>(
        app,
        '/ocr-jobs/upload',
        { ocrProvider_0: OcrProvider.Mistral, jobName: 'AAA_Job' },
        { name: 'file', filename: 'a_sort.jpg', content: fileData, contentType: MimeType.Jpeg },
      );
      await TestHelpers.expectUpload<{ id: number }>(
        app,
        '/ocr-jobs/upload',
        { ocrProvider_0: OcrProvider.Mistral, jobName: 'ZZZ_Job' },
        { name: 'file', filename: 'z_sort.jpg', content: fileData, contentType: MimeType.Jpeg },
      );

      // 2. Sort by name ASC
      const nameAsc = await TestHelpers.expectOk<PaginatedResponse<OcrJobEntity>>(app, '/ocr-jobs?sortField=name&sortOrder=ASC');
      expect(nameAsc.data[0].name).toBe('AAA_Job');

      // 3. Sort by name DESC
      const nameDesc = await TestHelpers.expectOk<PaginatedResponse<OcrJobEntity>>(app, '/ocr-jobs?sortField=name&sortOrder=DESC');
      expect(nameDesc.data[0].name).toBe('ZZZ_Job');

      // 4. Sort by filesCount DESC
      await TestHelpers.expectOk<PaginatedResponse<OcrJobEntity>>(app, '/ocr-jobs?sortField=filesCount&sortOrder=DESC');
    });
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

  it('/ocr-jobs/uploads/:key (GET)', async () => {
    const uploadRes = await TestHelpers.expectUpload<{ id: number }>(
      app,
      '/ocr-jobs/upload',
      { ocrProvider_0: OcrProvider.Mistral, jobName: 'Preview Job' },
      { name: 'file', filename: 'preview.jpg', content: 'dummy-image-contents', contentType: MimeType.Jpeg },
    );

    const job = await TestHelpers.expectOk<OcrJobEntity>(app, `/ocr-jobs/${uploadRes.id}`);
    const key = job.files[0].filename;

    // Valid file preview check ensures native MimeType mapping triggers properly
    const previewBody = await TestHelpers.expectOk<Buffer>(app, `/ocr-jobs/uploads/${key}`);
    expect(previewBody.toString()).toBe('dummy-image-contents');

    // Verification of NOT FOUND isolation
    await TestHelpers.expectNotFound(app, '/ocr-jobs/uploads/invalid-key.jpg');
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

  describe('/ocr-jobs/:id (DELETE)', () => {
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
      await TestHelpers.expectBadRequestGet(app, `/ocr-jobs/${id}`);
    });

    it('/ocr-jobs/:id (GET) - not found', async () => {
      await TestHelpers.expectBadRequestGet(app, '/ocr-jobs/999999');
    });

    it('/ocr-jobs/upload (POST) - invalid ocr provider returns 400', async () => {
      await TestHelpers.expectBadRequestUpload(
        app,
        '/ocr-jobs/upload',
        { ocrProvider_0: 'invalid-provider', jobName: 'Bad Provider Job' },
        { name: 'file', filename: 'bad-provider.jpg', content: fileData, contentType: MimeType.Jpeg },
      );
    });

    it('/ocr-jobs/upload (POST) - multiple files', async () => {
      const body = await TestHelpers.expectMultiFileUpload<{ id: number }>(
        app,
        '/ocr-jobs/upload',
        { ocrProvider_0: OcrProvider.Mistral, ocrProvider_1: OcrProvider.Mistral, jobName: 'Multi File Job' },
        [
          { name: 'file', filename: 'multi-file-1.jpg', content: fileData, contentType: MimeType.Jpeg },
          { name: 'file', filename: 'multi-file-2.jpg', content: fileData, contentType: MimeType.Jpeg },
        ],
      );

      expect(body).toHaveProperty('id');
      expect(queueServiceMock.addToOcrQueue).toHaveBeenCalledTimes(2);

      const job = await TestHelpers.expectOk<OcrJobEntity>(app, `/ocr-jobs/${body.id}`);
      expect(job.files).toHaveLength(2);
      expect(job.files.map((f) => f.originalName)).toEqual(expect.arrayContaining(['multi-file-1.jpg', 'multi-file-2.jpg']));
    });
  });
});
