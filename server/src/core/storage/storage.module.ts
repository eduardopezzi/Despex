import { Global, Module } from '@nestjs/common';
import { LocalStorageProvider } from '@core/storage/local-storage.provider';
import { StorageProviderDefinition } from '@core/storage/storage.provider';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { OneDriveStorageProvider } from '@core/storage/onedrive-storage.provider';

@Global()
@Module({
  providers: [StorageProviderDefinition, LocalStorageProvider, OneDriveStorageProvider],
  exports: [StorageProvider, LocalStorageProvider, OneDriveStorageProvider],
})
export class StorageModule {}
