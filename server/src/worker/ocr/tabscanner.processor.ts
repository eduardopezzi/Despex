import { Inject, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';
import { getMimeType } from '@worker/ocr/utils/mime-type.util';
import { extname } from 'path';
import { FileExtension } from '@open-receipt-ocr/types';
import FormData from 'form-data';

@Injectable()
export class TabScannerProcessor {
  private readonly logger = new Logger(TabScannerProcessor.name);
  private readonly baseUrl = 'https://api.tabscanner.com/api/2';

  constructor(
    @Inject(SecretProvider) private readonly secretProvider: SecretProvider,
    private readonly storage: StorageProvider,
  ) {}

  async process(file: OcrFileEntity, executionId: number): Promise<string> {
    const apiKey = await this.secretProvider.getSecretOrThrow(AppSecret.TabScannerApiKey);

    const fileStream = await this.storage.getStream(file.filename);
    const fileBuffer = await this.streamToBuffer(fileStream);
    const mimeType = getMimeType(extname(file.originalName).toLowerCase() as FileExtension);

    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: file.originalName,
      contentType: mimeType,
    });
    formData.append('documentType', 'auto');

    this.logger.log(`Uploading file to TabScanner for execution #${executionId}`);

    const processResponse = await axios.post(`${this.baseUrl}/process`, formData, {
      headers: {
        apikey: apiKey,
        ...formData.getHeaders(),
      },
    });

    const data = processResponse.data as { status: 'pending' | 'done' | 'failed' | 'success'; token: string; code: number };

    // TabScanner returns status 'pending' on successful upload
    if (data.status !== 'pending' && data.status !== 'success' && data.code !== 200) {
      throw new Error(`TabScanner process failed: ${JSON.stringify(data)}`);
    }

    const token = data.token;
    if (!token) {
      throw new Error('TabScanner did not return a token');
    }

    this.logger.log(`File uploaded successfully. Token: ${token}. Waiting for results...`);

    // Recommended: wait 5 seconds before polling
    await new Promise((resolve) => setTimeout(resolve, 5000));

    return this.waitForResult(token, apiKey);
  }

  private async waitForResult(token: string, apiKey: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max polling

    while (attempts < maxAttempts) {
      this.logger.log(`Polling TabScanner result for token ${token} (attempt ${attempts + 1})`);

      const resultResponse = await axios.get(`${this.baseUrl}/result/${token}`, {
        headers: { apikey: apiKey },
      });

      const data = resultResponse.data as { status: 'done' | 'failed' };

      if (data.status === 'done') {
        return JSON.stringify(data);
      }

      if (data.status === 'failed') {
        throw new Error(`TabScanner processing failed: ${JSON.stringify(data)}`);
      }

      // If pending, wait 1 second and retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error(`TabScanner polling timed out after ${maxAttempts} attempts`);
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
