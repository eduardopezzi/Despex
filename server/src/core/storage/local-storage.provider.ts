import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { StorageProvider, UploadResult } from '@core/storage/storage-provider.interface';
import { StorageProviderType } from '@core/storage/storage-provider-type.enum';
import { AppSecret } from '@core/types/app-secret.enum';

@Injectable()
export class LocalStorageProvider extends StorageProvider {
  readonly name = StorageProviderType.Local;
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadDir: string;

  constructor() {
    super();
    this.uploadDir = join(process.cwd(), process.env[AppSecret.UploadsDir] || 'uploads');
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
    let size = 0;

    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(filePath);

      stream.on('data', (chunk: Buffer) => {
        size += chunk.length;
      });

      stream.pipe(writeStream);

      writeStream.on('finish', () => {
        resolve({
          url: `/api/uploads/${key}`,
          key,
          size,
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

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    if (existsSync(filePath)) {
      const { unlink } = await import('fs/promises');
      await unlink(filePath);
      this.logger.log(`Deleted file: ${filePath}`);
    }
  }
}
