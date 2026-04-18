import { Inject, Injectable, Logger } from '@nestjs/common';
import { TextractClient, AnalyzeExpenseCommand } from '@aws-sdk/client-textract';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';

@Injectable()
export class TextractProcessor {
  private readonly logger = new Logger(TextractProcessor.name);

  constructor(
    @Inject(SecretProvider) private readonly secretProvider: SecretProvider,
    private readonly storage: StorageProvider,
  ) {}

  async process(file: OcrFileEntity, executionId: number): Promise<string> {
    const accessKeyId = await this.secretProvider.getSecretOrThrow(AppSecret.AwsAccessKeyId);
    const secretAccessKey = await this.secretProvider.getSecretOrThrow(AppSecret.AwsSecretAccessKey);
    const region = await this.secretProvider.getSecretOrThrow(AppSecret.AwsRegion);

    const client = new TextractClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    const fileStream = await this.storage.getStream(file.filename);
    const bytes = await this.streamToBuffer(fileStream);

    this.logger.log(`Calling AWS Textract AnalyzeExpense for execution #${executionId}`);

    const response = await client.send(new AnalyzeExpenseCommand({ Document: { Bytes: bytes } }));

    return JSON.stringify(response);
  }

  private streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
