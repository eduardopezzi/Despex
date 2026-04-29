import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { StorageProvider, UploadResult } from '@core/storage/storage-provider.interface';
import { StorageProviderType } from '@core/storage/storage-provider-type.enum';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';

@Injectable()
export class LocalStorageProvider extends StorageProvider implements OnModuleInit {
  readonly name = StorageProviderType.Local;
  private readonly logger = new Logger(LocalStorageProvider.name);
  private uploadDir!: string;

  constructor(private readonly secretProvider: SecretProvider) {
    super();
  }

  async onModuleInit(): Promise<void> {
    this.uploadDir = await this.secretProvider.getSecretOrThrow(AppSecret.StorageLocalPath);
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
    this.logger.log(`Local storage initialised at: ${this.uploadDir}`);
  }

  uploadStream(
    stream: Readable,
    filename: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _mimetype: string,
  ): Promise<UploadResult> {
    const key = `${randomUUID()}${extname(filename)}`;
    const filePath = join(this.uploadDir, key);

    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(filePath);

      stream.pipe(writeStream);

      writeStream.on('finish', () => {
        resolve({
          url: `/api/uploads/${key}`,
          key,
          size: writeStream.bytesWritten,
        });
      });

      writeStream.on('error', (err) => {
        reject(new InternalServerErrorException(`Local stream upload failed: ${err.message}`));
      });
    });
  }

  /** Returns the full disk path for a given storage key — used for file serving. */
  getFilePath(key: string): string {
    return join(this.uploadDir, key);
  }

  async getStream(key: string): Promise<Readable> {
    const filePath = this.getFilePath(key);
    if (!existsSync(filePath)) {
      throw new InternalServerErrorException(`File ${key} not found in local storage`);
    }
    const { createReadStream } = await import('fs');
    return createReadStream(filePath);
  }

  exists(key: string): boolean {
    const filePath = this.getFilePath(key);
    return existsSync(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    if (existsSync(filePath)) {
      const { unlink } = await import('fs/promises');
      await unlink(filePath);
      this.logger.log(`Deleted file: ${filePath}`);
    }
  }
}
