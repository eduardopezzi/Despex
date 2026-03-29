import { INestApplication } from '@nestjs/common';
import { DatabaseModule } from '@core/database/database.module';
import { ReceiptsModule } from '@biz-modules/receipts/receipts.module';
import { StorageModule } from '@core/storage/storage.module';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestHelpers } from '@tests/test-helpers';
import { ReceiptEntity } from '@core/database/entities/receipt.entity';
import { MimeType, OcrProvider, ReceiptStatus } from '@open-receipt-ocr/types';
import { MockQueueService, TestContextHelpers } from '@tests/test-context.helpers';
import { ReceiptsDao } from '@core/database/daos/receipts.dao';

describe('Receipts Controller (e2e) with unique Schema', () => {
  let app: INestApplication;
  let queueServiceMock: MockQueueService;

  const fileData = 'test content';

  beforeAll(async () => {
    const context = await TestContextHelpers.createTestContext({
      imports: [DatabaseModule, StorageModule, ReceiptsModule],
    });
    app = context.app;
    queueServiceMock = context.mocks.queueService;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/receipts (GET)', async () => {
    const body = await TestHelpers.expectOk(app, '/receipts');
    expect(body).toEqual([]);
  });

  it('/receipts/upload (POST)', async () => {
    const body = await TestHelpers.expectUpload<{ id: number; message: string }>(
      app,
      '/receipts/upload',
      { ocrProvider: OcrProvider.Mistral },
      { name: 'file', filename: 'test.jpg', content: fileData, contentType: MimeType.Jpeg },
    );

    expect(body).toHaveProperty('id');
    expect(queueServiceMock.addToOcrQueue).toHaveBeenCalledOnce();
    expect(queueServiceMock.addToOcrQueue).toHaveBeenCalledWith({ receiptId: body.id });
  });

  it('/receipts/:id (GET)', async () => {
    const uploadRes = await TestHelpers.expectUpload<Pick<ReceiptEntity, 'id'>>(
      app,
      '/receipts/upload',
      { ocrProvider: OcrProvider.Mistral },
      { name: 'file', filename: 'test.jpg', content: fileData, contentType: MimeType.Jpeg },
    );

    const id = uploadRes.id;

    const receipt = await TestHelpers.expectOk<ReceiptEntity>(app, `/receipts/${id}`);

    expect(receipt).toMatchObject<Partial<ReceiptEntity>>({
      id: id,
      originalName: 'test.jpg',
      ocrProvider: OcrProvider.Mistral,
    });
  });

  it('/receipts/:id/retry (POST)', async () => {
    const uploadRes = await TestHelpers.expectUpload<Pick<ReceiptEntity, 'id'>>(
      app,
      '/receipts/upload',
      { ocrProvider: OcrProvider.Mistral },
      { name: 'file', filename: 'retry-test.jpg', content: fileData, contentType: MimeType.Jpeg },
    );
    const id = uploadRes.id;

    // Clear the initial queue call from the upload
    queueServiceMock.addToOcrQueue.mockClear();

    // Import DAO and Status to force a failure state
    const dao = app.get(ReceiptsDao);

    // Set to failed with some mock data
    await dao.updateStatus(id, ReceiptStatus.Failed, null);

    // Call retry
    const retryRes = await TestHelpers.expectCreated<{ id: number; status: string }>(app, `/receipts/${id}/retry`);

    expect(retryRes.id).toBe(id);
    expect(retryRes.status).toBe(ReceiptStatus.Pending);

    // Verify queue was called again
    expect(queueServiceMock.addToOcrQueue).toHaveBeenCalledOnce();
    expect(queueServiceMock.addToOcrQueue).toHaveBeenCalledWith({ receiptId: id });

    // Verify DB state
    const updatedReceipt = await TestHelpers.expectOk<ReceiptEntity>(app, `/receipts/${id}`);
    expect(updatedReceipt.status).toBe(ReceiptStatus.Pending);
    expect(updatedReceipt.ocrData).toBeNull();
  });

  it('/receipts/:id (DELETE)', async () => {
    // 1. Upload a receipt
    const uploadRes = await TestHelpers.expectUpload<Pick<ReceiptEntity, 'id'>>(
      app,
      '/receipts/upload',
      { ocrProvider: OcrProvider.Mistral },
      { name: 'file', filename: 'delete-test.jpg', content: fileData, contentType: MimeType.Jpeg },
    );
    const id = uploadRes.id;

    // 2. Verify it exists
    await TestHelpers.expectOk(app, `/receipts/${id}`);

    // 3. Delete it
    await TestHelpers.expectDelete(app, `/receipts/${id}`);

    // 4. Verify it's gone
    const { default: request } = await import('supertest');
    await request(app.getHttpServer()).get(`/receipts/${id}`).expect(404);
  });
});
