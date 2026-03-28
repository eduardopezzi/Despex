import { Provider } from '@nestjs/common';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { StorageProviderType } from '@core/storage/storage-provider-type.enum';
import { LocalStorageProvider } from '@core/storage/local-storage.provider';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { AppSecret } from '@core/types/app-secret.enum';

export const StorageProviderDefinition: Provider = {
  provide: StorageProvider,
  useFactory: async (secretProvider: SecretProvider, local: LocalStorageProvider) => {
    const providerName = await secretProvider.getSecret(AppSecret.StorageProvider);

    switch (providerName) {
      case StorageProviderType.Local:
      default:
        return local;
    }
  },
  inject: [SecretProvider, LocalStorageProvider],
};
