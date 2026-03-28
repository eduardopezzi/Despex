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

/**
 * Abstract storage provider.
 *
 * All uploads go through `uploadStream()` so the data is piped directly
 * from the HTTP request to the storage destination without buffering in RAM.
 */
export abstract class StorageProvider {
  abstract readonly name: StorageProviderType;

  abstract uploadStream(stream: Readable, filename: string, mimetype: string): Promise<UploadResult>;
}
