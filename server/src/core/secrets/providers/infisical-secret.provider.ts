import { Injectable, Logger } from '@nestjs/common';
import { InfisicalSDK } from '@infisical/sdk';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { SecretProviderType } from '@core/secrets/secret-provider-type.enum';

@Injectable()
export class InfisicalSecretProvider extends SecretProvider {
  readonly name = SecretProviderType.Infisical;
  private client: InfisicalSDK | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private readonly logger = new Logger(InfisicalSecretProvider.name);

  async getSecret(name: AppSecret): Promise<string | undefined> {
    await this.ensureInitialized();

    const projectId = process.env[AppSecret.InfisicalProjectId];

    if (!this.client || !projectId) {
      // Fall back to env if Infisical is not configured
      return process.env[name];
    }

    const environment = process.env[AppSecret.InfisicalEnvironment] || 'dev';

    try {
      const secret = await this.client.secrets().getSecret({
        secretName: name,
        environment,
        projectId,
        secretPath: '/',
      });
      return secret.secretValue;
    } catch {
      this.logger.warn(`Secret "${name}" not found in Infisical. Falling back to process.env.`);
      return process.env[name];
    }
  }

  private ensureInitialized(): Promise<void> {
    if (this.isInitialized) return Promise.resolve();
    if (!this.initPromise) {
      this.initPromise = this.initialize();
    }
    return this.initPromise;
  }

  private async initialize(): Promise<void> {
    const clientId = process.env[AppSecret.InfisicalClientId];
    const clientSecret = process.env[AppSecret.InfisicalClientSecret];
    const projectId = process.env[AppSecret.InfisicalProjectId];

    if (!clientId || !clientSecret || !projectId) {
      this.logger.warn('Infisical configuration missing — falling back to process.env.');
      this.isInitialized = true;
      return;
    }

    const siteUrl = process.env[AppSecret.InfisicalSiteUrl];
    const sdk = new InfisicalSDK(siteUrl ? { siteUrl } : undefined);

    try {
      await sdk.auth().universalAuth.login({ clientId, clientSecret });
      this.client = sdk;
      this.logger.log('Successfully authenticated with Infisical.');
    } catch (error) {
      this.logger.error('Failed to authenticate with Infisical — falling back to process.env.', error);
      this.client = null;
    }

    this.isInitialized = true;
  }
}
