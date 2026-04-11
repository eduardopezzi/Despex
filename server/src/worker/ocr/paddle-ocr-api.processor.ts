import { Inject, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';

@Injectable()
export class PaddleOcrApiProcessor {
  private readonly logger = new Logger(PaddleOcrApiProcessor.name);

  constructor(
    @Inject(SecretProvider) private readonly secretProvider: SecretProvider,
    private readonly storage: StorageProvider,
  ) {}

  async process(file: OcrFileEntity, executionId: number): Promise<string> {
    const apiKey = await this.secretProvider.getSecretOrThrow(AppSecret.PaddleOcrApiKey);
    const endpoint = await this.secretProvider.getSecretOrThrow(AppSecret.PaddleOcrEndpoint);

    const fileStream = await this.storage.getStream(file.filename);
    const fileBuffer = await this.streamToBuffer(fileStream);
    const base64Content = fileBuffer.toString('base64');

    this.logger.log(`Calling PaddleOCR API for execution #${executionId}`);

    try {
      const response = await axios.post(
        endpoint,
        {
          images: [base64Content],
          parameters: {
            language: 'auto',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 second timeout
        },
      );

      const data = response.data as Record<string, unknown>;

      if (!data || data.error) {
        throw new Error(`PaddleOCR API returned an error: ${JSON.stringify(data.error || data)}`);
      }

      return JSON.stringify(data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as Record<string, unknown> | undefined;
        const errorMessage = (responseData?.error as string) || error.message;
        throw new Error(`PaddleOCR API error: ${errorMessage}`);
      }
      throw error;
    }
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
