import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProviderType } from '@core/secrets/secret-provider-type.enum';

/**
 * Abstract secret provider. Inject this token to read secrets — never read
 * `process.env` directly in application code.
 *
 * Concrete implementations: EnvSecretProvider, InfisicalSecretProvider.
 */
export abstract class SecretProvider {
  abstract readonly name: SecretProviderType;

  abstract getSecret(name: AppSecret): Promise<string | undefined>;

  async getSecretAsInt(name: AppSecret): Promise<number | undefined> {
    const value = await this.getSecret(name);
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  }

  async getSecretAsIntOrThrow(name: AppSecret): Promise<number> {
    const value = await this.getSecretAsInt(name);
    if (value === undefined) {
      throw new Error(
        `Secret "${name}" is missing, empty, or not a valid integer. This secret is required for the application to function properly.`,
      );
    }
    return value;
  }

  async getSecretOrThrow(name: AppSecret): Promise<string> {
    const value = await this.getSecret(name);
    if (value === undefined || value === null || value === '') {
      throw new Error(
        `Secret "${name}" is missing or empty. This secret is required for the application to function properly.`,
      );
    }
    return value;
  }
}
