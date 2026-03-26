import { Readable } from 'stream';
import { StorageProviderType } from '@core/storage/storage-provider-type.enum';

export interface UploadResult {
  /** Public-facing URL (or local path for API serving) */
  url: string;
  /** Unique key / filename used internally by the provider */
  key: string;
  /** Size in bytes */
  size: number;
}

export abstract class StorageProvider {
  abstract readonly name: StorageProviderType;

  abstract upload(file: Express.Multer.File): Promise<UploadResult>;

  abstract uploadStream(
    stream: Readable,
    filename: string,
    mimetype: string,
  ): Promise<UploadResult>;
}
