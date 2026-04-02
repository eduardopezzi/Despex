import { Inject, Injectable, Logger } from '@nestjs/common';
import { Mistral } from '@mistralai/mistralai';
import { extname } from 'path';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { MimeType, FileExtension } from '@open-receipt-ocr/types';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';

@Injectable()
export class MistralProcessor {
  private readonly logger = new Logger(MistralProcessor.name);

  constructor(
    @Inject(SecretProvider) private readonly secretProvider: SecretProvider,
    private readonly storage: StorageProvider,
  ) {}

  async process(file: OcrFileEntity, executionId: number): Promise<string> {
    const mistralApiKey = await this.secretProvider.getSecretOrThrow(AppSecret.MistralApiKey);
    const client = new Mistral({ apiKey: mistralApiKey });

    const fileStream = await this.storage.getStream(file.filename);
    const base64Content = await this.streamToBase64(fileStream);
    const mimeType = MistralProcessor.getMimeType(extname(file.filename).toLowerCase());

    this.logger.log(`Calling Mistral OCR API (SDK) for execution #${executionId}`);

    const ocrResponse = await client.ocr.process({
      model: 'mistral-ocr-latest',
      document: {
        type: 'document_url',
        documentUrl: `data:${mimeType};base64,${base64Content}`,
      },
      tableFormat: 'html',
      includeImageBase64: true,
    });

    return JSON.stringify(ocrResponse);
  }

  private streamToBase64(stream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer.toString('base64'));
      });
      stream.on('error', reject);
    });
  }

  private static getMimeType(ext: FileExtension): string {
    switch (ext) {
      case FileExtension.Pdf:
        return MimeType.Pdf;
      case FileExtension.Jpg:
      case FileExtension.Jpeg:
        return MimeType.Jpeg;
      case FileExtension.Png:
        return MimeType.Png;
      default:
        return MimeType.OctetStream;
    }
  }
}
