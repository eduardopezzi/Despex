import { INestApplication } from '@nestjs/common';
import { DatabaseModule } from '@core/database/database.module';
import { ReceiptsModule } from '@biz-modules/receipts/receipts.module';
import { StorageModule } from '@core/storage/storage.module';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestHelpers } from '../../test-helpers';
import { ReceiptEntity } from '@core/database/entities/receipt.entity';
import { MimeType } from '@core/types/mime-type.enum';
import { OcrProvider } from '@open-receipt-ocr/types';
import { MockQueueService, TestContextHelpers } from '@tests/test-context.helpers';

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
    expect(queueServiceMock.addToOcrQueue).toHaveBeenCalled();
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
});
