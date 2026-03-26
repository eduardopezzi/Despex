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
