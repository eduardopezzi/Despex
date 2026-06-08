import { INestApplication } from '@nestjs/common';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { ConfigModule } from '@app/config/config.module';
import { AppSecret } from '@core/types/app-secret.enum';
import { OcrProvider, OcrProviderAvailability } from '@open-receipt-ocr/types';
import { TestContextHelpers } from '@tests/test-context.helpers';
import { TestHelpers } from '@tests/test-helpers';

describe('Config Controller (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const context = await TestContextHelpers.createTestContext({
      imports: [ConfigModule],
    });
    app = context.app;
    context.mocks.secretProvider.getSecret.mockImplementation((key: AppSecret) => {
      if (key === AppSecret.PaddleOcrLocalEnabled) return 'true';
      if (key === AppSecret.GeminiApiKey) return 'gemini-key';
      if (key === AppSecret.AwsAccessKeyId) return 'aws-key';
      if (key === AppSecret.AwsSecretAccessKey) return 'aws-secret';
      if (key === AppSecret.AwsRegion) return 'us-east-1';
      return undefined;
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/config/ocr-providers (GET) - lists only configured OCR providers', async () => {
    const body = await TestHelpers.expectOk<OcrProviderAvailability>(app, '/config/ocr-providers');

    expect(body.availableProviders).toContain(OcrProvider.PaddleOcrLocal);
    expect(body.availableProviders).toContain(OcrProvider.Gemini);
    expect(body.availableProviders).toContain(OcrProvider.AwsTextract);
    expect(body.availableProviders).not.toContain(OcrProvider.OpenAi);
    expect(body.availableProviders).not.toContain(OcrProvider.Mistral);
  });
});
