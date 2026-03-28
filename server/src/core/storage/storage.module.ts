import { Global, Module } from '@nestjs/common';
import { LocalStorageProvider } from '@core/storage/local-storage.provider';
import { StorageProviderDefinition } from '@core/storage/storage.provider';
import { StorageProvider } from '@core/storage/storage-provider.interface';

@Global()
@Module({
  providers: [StorageProviderDefinition, LocalStorageProvider],
  exports: [StorageProvider, LocalStorageProvider],
})
export class StorageModule {}
