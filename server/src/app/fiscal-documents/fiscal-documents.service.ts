import { Injectable, Logger } from '@nestjs/common';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { FiscalFetchStatus, FiscalLookupProvider } from '@open-receipt-ocr/types';
import { FiscalDocumentProvider, FiscalLookupResult } from '@app/fiscal-documents/fiscal-document-provider.interface';
import { SefazDfeProvider } from '@app/fiscal-documents/providers/sefaz-dfe.provider';
import { extractFiscalAccessKey, getFiscalDocumentTypeFromAccessKey } from '@app/fiscal-documents/utils/access-key.util';

@Injectable()
export class FiscalDocumentsService {
  private readonly logger = new Logger(FiscalDocumentsService.name);

  constructor(
    private readonly secretProvider: SecretProvider,
    private readonly sefazDfeProvider: SefazDfeProvider,
  ) {}

  extractAccessKey(input?: string | null): string | null {
    return extractFiscalAccessKey(input);
  }

  async lookupFromText(input?: string | null): Promise<FiscalLookupResult | null> {
    const accessKey = this.extractAccessKey(input);
    if (!accessKey) return null;
    return this.lookupByAccessKey(accessKey);
  }

  async lookupByAccessKey(accessKey: string): Promise<FiscalLookupResult> {
    const enabled = await this.isLookupEnabled();
    const documentType = getFiscalDocumentTypeFromAccessKey(accessKey);

    if (!enabled) {
      return {
        status: FiscalFetchStatus.NotAttempted,
        accessKey,
        documentType,
        message: 'Fiscal lookup is disabled. Set FISCAL_LOOKUP_ENABLED=true to enable official lookup attempts.',
      };
    }

    try {
      const provider = await this.getProvider();
      return await provider.lookupByAccessKey({ accessKey });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fiscal lookup failed for access key ${accessKey}: ${message}`);
      return {
        status: FiscalFetchStatus.Failed,
        accessKey,
        documentType,
        message,
      };
    }
  }

  private async isLookupEnabled(): Promise<boolean> {
    const rawValue = await this.secretProvider.getSecret(AppSecret.FiscalLookupEnabled);
    return rawValue === 'true';
  }

  private async getProvider(): Promise<FiscalDocumentProvider> {
    const provider = ((await this.secretProvider.getSecret(AppSecret.FiscalProvider)) || FiscalLookupProvider.SefazDfe) as FiscalLookupProvider;
    if (provider === FiscalLookupProvider.SefazDfe) {
      return this.sefazDfeProvider;
    }
    return this.sefazDfeProvider;
  }
}
