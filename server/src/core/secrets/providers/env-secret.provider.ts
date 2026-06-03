import { Injectable, Logger } from '@nestjs/common';
import { AppSecret, DefaultAppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { SecretProviderType } from '@core/secrets/secret-provider-type.enum';

@Injectable()
export class EnvSecretProvider extends SecretProvider {
  readonly name = SecretProviderType.Env;
  private readonly logger = new Logger(EnvSecretProvider.name);

  // eslint-disable-next-line
  async getSecret(name: AppSecret): Promise<string | undefined> {
    const value = process.env[name];
    if (value === undefined) {
      const defaultValue = DefaultAppSecret[name];
      if (defaultValue !== undefined) {
        return String(defaultValue);
      }
      this.logger.debug(`Secret "${name}" not found in Env.`);
    }
    return value;
  }
}
