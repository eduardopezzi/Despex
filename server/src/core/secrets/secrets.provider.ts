import { Provider } from '@nestjs/common';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProviderType } from '@core/secrets/secret-provider-type.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { EnvSecretProvider } from '@core/secrets/providers/env-secret.provider';
import { InfisicalSecretProvider } from '@core/secrets/providers/infisical-secret.provider';

export const SecretProviderDefinition: Provider = {
  provide: SecretProvider,
  useFactory: (
    envProvider: EnvSecretProvider,
    infisicalProvider: InfisicalSecretProvider,
  ) => {
    // We use process.env directly here (bootstrap-only) to pick the provider implementation
    const providerName = process.env[AppSecret.SecretProvider];

    switch (providerName) {
      case SecretProviderType.Infisical:
        return infisicalProvider;
      case SecretProviderType.Env:
      default:
        return envProvider;
    }
  },
  inject: [EnvSecretProvider, InfisicalSecretProvider],
};
