import { Inject, Injectable, Logger } from '@nestjs/common';
import { recognize } from 'tesseract.js';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';
import { streamToBuffer } from '@core/utils/stream.util';

@Injectable()
export class TesseractProcessor {
  private readonly logger = new Logger(TesseractProcessor.name);

  constructor(
    @Inject(SecretProvider) private readonly secretProvider: SecretProvider,
    private readonly storage: StorageProvider,
  ) {}

  async process(file: OcrFileEntity, executionId: number): Promise<string> {
    const language = await this.secretProvider.getSecretOrThrow(AppSecret.TesseractLanguage);

    const fileStream = await this.storage.getStream(file.filename);
    const buffer = await streamToBuffer(fileStream);

    this.logger.log(`Running Tesseract.js (lang: ${language}) for execution #${executionId}`);

    const result = await recognize(buffer, language, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === 'recognizing text') {
          this.logger.verbose(`Tesseract execution #${executionId}: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const text = result.data.text;
    const confidence = result.data.confidence;

    return JSON.stringify({ text, language, confidence });
  }
}
