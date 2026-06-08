import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { AppSecret } from '@core/types/app-secret.enum';
import { QueueService } from '@core/queue/queue.service';
import { SecretProviderType } from '@core/secrets/secret-provider-type.enum';
import { vi } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';

export interface TestContext {
  app: INestApplication;
  mocks: {
    secretProvider: MockSecretProvider;
    queueService: MockQueueService;
  };
}

export interface CreateTestAppOptions {
  imports: any[];
  overrides?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
}

export class MockSecretProvider extends SecretProvider {
  constructor(private readonly dbPath: string) {
    super();
  }
  name = SecretProviderType.Env; // Use a valid enum value or create a test one if exist

  getSecret = vi.fn().mockImplementation((key: AppSecret) => {
    if (key === AppSecret.NodeEnv) return 'test';
    if (key === AppSecret.DatabasePath) return this.dbPath;
    if (key === AppSecret.RedisHost) return 'localhost';
    if (key === AppSecret.RedisPort) return '6379';
    if (key === AppSecret.PaddleOcrLocalEnabled) return 'true';
    if (key === AppSecret.StorageLocalPath) return path.join(os.tmpdir(), 'ocr-test-mocked-upload');
    return undefined;
  });

  override getSecretOrThrow = vi.fn().mockImplementation((key: AppSecret) => {
    if (key === AppSecret.DatabasePath) return this.dbPath;
    if (key === AppSecret.RedisHost) return 'localhost';
    if (key === AppSecret.StorageLocalPath) return path.join(os.tmpdir(), 'ocr-test-mocked-upload');
    return 'mocked';
  });

  override getSecretAsIntOrThrow = vi.fn().mockReturnValue(Promise.resolve(6379));
}

export class MockQueueService extends QueueService {
  constructor() {
    super(null as any);
  }
  override addToOcrQueue = vi.fn();
}

export class TestContextHelpers {
  static async createTestContext(options: CreateTestAppOptions): Promise<TestContext> {
    const dbPath = ':memory:';

    const mockSecretProvider = new MockSecretProvider(dbPath);
    const mockQueueService = new MockQueueService();

    let builder = Test.createTestingModule({
      imports: options.imports,
    })
      .overrideProvider(SecretProvider)
      .useValue(mockSecretProvider)
      .overrideProvider(QueueService)
      .useValue(mockQueueService);

    if (options.overrides) {
      builder = options.overrides(builder);
    }

    const moduleFixture = await builder.compile();
    const app = moduleFixture.createNestApplication();
    await app.init();

    return {
      app,
      mocks: {
        secretProvider: mockSecretProvider,
        queueService: mockQueueService,
      },
    };
  }
}
