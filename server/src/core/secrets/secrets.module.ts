import { Global, Module } from '@nestjs/common';
import { EnvSecretProvider } from '@core/secrets/providers/env-secret.provider';
import { InfisicalSecretProvider } from '@core/secrets/providers/infisical-secret.provider';
import { SecretProviderDefinition } from '@core/secrets/secrets.provider';
import { SecretProvider } from '@core/secrets/secret-provider.interface';

@Global()
@Module({
  providers: [
    SecretProviderDefinition,
    EnvSecretProvider,
    InfisicalSecretProvider,
  ],
  exports: [SecretProvider],
})
export class SecretsModule {}
