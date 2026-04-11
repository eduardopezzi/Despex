import { Inject, Injectable, Logger } from '@nestjs/common';
import { PaddleOcrResult, PaddleOcrService } from 'ppu-paddle-ocr';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';

@Injectable()
export class PaddleOcrLocalProcessor {
  private readonly logger = new Logger(PaddleOcrLocalProcessor.name);

  constructor(
    @Inject(SecretProvider) private readonly secretProvider: SecretProvider,
    private readonly storage: StorageProvider,
  ) {
    this.logger.log('PaddleOCR local module initialized');
  }

  async process(file: OcrFileEntity, executionId: number): Promise<string> {
    const enabled = await this.secretProvider.getSecret(AppSecret.PaddleOcrLocalEnabled);
    if (enabled?.toLowerCase() !== 'true') {
      throw new Error('PaddleOCR local is not enabled. Set PADDLE_OCR_LOCAL_ENABLED=true');
    }

    const fileStream = await this.storage.getStream(file.filename);
    const fileBuffer = await this.streamToBuffer(fileStream);

    this.logger.log(`Processing with local PaddleOCR for execution #${executionId}`);

    const paddleOcr = new PaddleOcrService();

    try {
      await paddleOcr.initialize();

      try {
        const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) as ArrayBuffer;

        const results = await paddleOcr.recognize(arrayBuffer);
        const formattedResults = this.formatPaddleOcrResults(results);
        return JSON.stringify(formattedResults);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`PaddleOCR local processing failed: ${message}`);
      }
    } finally {
      await paddleOcr.destroy();
    }
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  private formatPaddleOcrResults(results: PaddleOcrResult): object {
    const textBlocks: { text: string; confidence: number; bbox: unknown }[] = [];

    if (Array.isArray(results.lines)) {
      for (const line of results.lines) {
        if (Array.isArray(line)) {
          for (const item of line) {
            textBlocks.push({
              text: item.text || '',
              confidence: item.confidence || 0,
              bbox: item.box,
            });
          }
        }
      }
    }

    const pages = [{ blocks: textBlocks }];

    return {
      pages,
      model: 'paddle-ocr',
      provider: 'paddle-ocr-local',
    };
  }
}
