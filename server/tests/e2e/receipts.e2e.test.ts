import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DatabaseModule } from '@core/database/database.module';
import { ReceiptsModule } from '@biz-modules/receipts/receipts.module';
import { StorageModule } from '@core/storage/storage.module';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { AppSecret } from '@core/types/app-secret.enum';
import { QueueService } from '@core/queue/queue.service';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { TestHelpers } from '../test-helpers';
import { ReceiptEntity } from '@core/database/entities/receipt.entity';

describe('Receipts Controller (e2e) with unique Schema', () => {
  let app: INestApplication;
  const mockQueueService = {
    addToOcrQueue: vi.fn(),
  };

  const fileData =
    '------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="ocrProvider"\r\n\r\nmistral\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n<data>\r\n------WebKitFormBoundary7MA4YWxkTrZu0gW--\r\n';

  const dbPath = ':memory:';

  const mockSecretProvider = {
    getSecret: vi.fn().mockImplementation((key) => {
      if (key === AppSecret.NodeEnv) return 'test';
      if (key === AppSecret.DatabasePath) return dbPath;
      if (key === AppSecret.RedisHost) return 'localhost';
      if (key === AppSecret.RedisPort) return '6379';
      return null;
    }),
    getSecretOrThrow: vi.fn().mockImplementation((key) => {
      if (key === AppSecret.DatabasePath) return dbPath;
      if (key === AppSecret.RedisHost) return 'localhost';
      return 'mocked';
    }),
    getSecretAsIntOrThrow: vi.fn().mockReturnValue(6379),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DatabaseModule, StorageModule, ReceiptsModule],
    })
      .overrideProvider(SecretProvider)
      .useValue(mockSecretProvider)
      .overrideProvider(QueueService)
      .useValue(mockQueueService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
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
      { ocrProvider: 'mistral' },
      { name: 'file', filename: 'test.jpg', content: fileData, contentType: 'image/jpeg' },
    );

    expect(body).toHaveProperty('id');
    expect(mockQueueService.addToOcrQueue).toHaveBeenCalled();
  });

  it('/receipts/:id (GET)', async () => {
    const uploadRes = await TestHelpers.expectUpload<{ id: string }>(
      app,
      '/receipts/upload',
      { ocrProvider: 'mistral' },
      { name: 'file', filename: 'test.jpg', content: fileData, contentType: 'image/jpeg' },
    );

    const id = uploadRes.id;

    const receipt = await TestHelpers.expectOk<ReceiptEntity>(app, `/receipts/${id}`);
    expect(receipt.id).toHaveProperty('id', id);
    expect(receipt.originalName).toBe('test.jpg');
    expect(receipt.ocrProvider).toBe('mistral');
  });
});
