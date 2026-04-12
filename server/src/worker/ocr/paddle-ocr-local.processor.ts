import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PaddleOcrResult, PaddleOcrService } from 'ppu-paddle-ocr';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';

@Injectable()
export class PaddleOcrLocalProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaddleOcrLocalProcessor.name);

  private paddleOcr: PaddleOcrService | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor(
    @Inject(SecretProvider) private readonly secretProvider: SecretProvider,
    private readonly storage: StorageProvider,
  ) {
    this.logger.log('PaddleOCR local module instantiated');
  }

  async onModuleInit() {
    await this.ensureInitialized(undefined, true);
  }

  async onModuleDestroy() {
    if (this.paddleOcr) {
      this.logger.log('Destroying PaddleOCR sessions...');
      await this.paddleOcr.destroy();
    }
  }

  private async ensureInitialized(executionId?: number, isBackground = false): Promise<void> {
    const enabled = await this.secretProvider.getSecret(AppSecret.PaddleOcrLocalEnabled);
    if (enabled?.toLowerCase() !== 'true') {
      if (isBackground) return;
      throw new Error('PaddleOCR local is not enabled. Set PADDLE_OCR_LOCAL_ENABLED=true');
    }

    if (!this.paddleOcr) {
      this.paddleOcr = new PaddleOcrService();
    }

    if (!this.paddleOcr.isInitialized()) {
      let isAlreadyInitializing = true;

      if (!this.initializationPromise) {
        isAlreadyInitializing = false;

        if (isBackground) {
          this.logger.log('Starting PaddleOCR background initialization...');
        } else if (executionId !== undefined) {
          this.logger.log(`Initializing PaddleOCR for execution #${executionId}...`);
        }

        this.initializationPromise = this.paddleOcr.initialize().catch((err) => {
          this.logger.error('Failed to initialize PaddleOCR', err);
          this.initializationPromise = null;
        });
      }

      if (!isBackground) {
        if (isAlreadyInitializing && executionId !== undefined) {
          this.logger.log(`Waiting for PaddleOCR background initialization for execution #${executionId}...`);
        }
        await this.initializationPromise;

        if (!this.paddleOcr.isInitialized()) {
          throw new Error('PaddleOCR failed to initialize properly.');
        }
      }
    }
  }

  async process(file: OcrFileEntity, executionId: number): Promise<string> {
    await this.ensureInitialized(executionId);

    const fileStream = await this.storage.getStream(file.filename);
    const fileBuffer = await this.streamToBuffer(fileStream);

    this.logger.log(`Processing with local PaddleOCR for execution #${executionId}`);

    try {
      const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) as ArrayBuffer;

      const results = await this.paddleOcr!.recognize(arrayBuffer);
      const formattedResults = this.formatPaddleOcrResults(results);
      return JSON.stringify(formattedResults);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PaddleOCR local processing failed: ${message}`);
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
