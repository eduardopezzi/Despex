import { Injectable } from '@nestjs/common';
import { OcrProvider, OcrProviderAvailability } from '@open-receipt-ocr/types';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { AppSecret } from '@core/types/app-secret.enum';

@Injectable()
export class ConfigService {
  constructor(private readonly secretProvider: SecretProvider) {}

  async getOcrProviderAvailability(): Promise<OcrProviderAvailability> {
    const checks: Array<[OcrProvider, Promise<boolean>]> = [
      [OcrProvider.PaddleOcrLocal, this.isPaddleOcrLocalAvailable()],
      [OcrProvider.Tesseract, this.hasAllSecrets([AppSecret.TesseractLanguage])],
      [OcrProvider.LlamaCpp, this.hasAllSecrets([AppSecret.LlamaCppBaseUrl, AppSecret.LlamaCppModel])],
      [OcrProvider.Mistral, this.hasAllSecrets([AppSecret.MistralApiKey])],
      [OcrProvider.TabScanner, this.hasAllSecrets([AppSecret.TabScannerApiKey])],
      [OcrProvider.PaddleOcrApi, this.hasAllSecrets([AppSecret.PaddleOcrApiKey, AppSecret.PaddleOcrEndpoint])],
      [OcrProvider.Gemini, this.hasAllSecrets([AppSecret.GeminiApiKey])],
      [OcrProvider.AwsTextract, this.hasAllSecrets([AppSecret.AwsAccessKeyId, AppSecret.AwsSecretAccessKey, AppSecret.AwsRegion])],
      [OcrProvider.Grok, this.hasAllSecrets([AppSecret.XaiApiKey])],
      [OcrProvider.OpenAi, this.hasAllSecrets([AppSecret.OpenAiApiKey])],
    ];

    const availableProviders: OcrProvider[] = [];
    for (const [provider, check] of checks) {
      if (await check) {
        availableProviders.push(provider);
      }
    }

    return { availableProviders };
  }

  private async isPaddleOcrLocalAvailable(): Promise<boolean> {
    const enabled = await this.secretProvider.getSecret(AppSecret.PaddleOcrLocalEnabled);
    return enabled?.toLowerCase() === 'true';
  }

  private async hasAllSecrets(keys: AppSecret[]): Promise<boolean> {
    const values = await Promise.all(keys.map((key) => this.secretProvider.getSecret(key)));
    return values.every((value) => !!value?.trim());
  }
}
