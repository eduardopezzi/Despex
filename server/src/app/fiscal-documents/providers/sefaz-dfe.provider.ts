import { Injectable, Logger } from '@nestjs/common';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { ExpenseSourceType, FiscalFetchStatus } from '@open-receipt-ocr/types';
import { FiscalDocumentProvider, FiscalLookupRequest, FiscalLookupResult } from '@app/fiscal-documents/fiscal-document-provider.interface';
import { getFiscalDocumentTypeFromAccessKey } from '@app/fiscal-documents/utils/access-key.util';

@Injectable()
export class SefazDfeProvider extends FiscalDocumentProvider {
  private readonly logger = new Logger(SefazDfeProvider.name);

  constructor(private readonly secretProvider: SecretProvider) {
    super();
  }

  async lookupByAccessKey(request: FiscalLookupRequest): Promise<FiscalLookupResult> {
    return this.downloadXmlByAccessKey(request);
  }

  async downloadXmlByAccessKey(request: FiscalLookupRequest): Promise<FiscalLookupResult> {
    const documentType = getFiscalDocumentTypeFromAccessKey(request.accessKey);
    const certPath = await this.secretProvider.getSecret(AppSecret.FiscalCertPath);
    const certPassword = await this.secretProvider.getSecret(AppSecret.FiscalCertPassword);
    const cnpj = await this.secretProvider.getSecret(AppSecret.FiscalCnpj);
    const uf = await this.secretProvider.getSecret(AppSecret.FiscalUf);

    if (!certPath || !certPassword || !cnpj || !uf) {
      return {
        status: FiscalFetchStatus.RequiresCertificate,
        accessKey: request.accessKey,
        documentType,
        message: 'Official DF-e lookup requires FISCAL_CERT_PATH, FISCAL_CERT_PASSWORD, FISCAL_CNPJ and FISCAL_UF.',
      };
    }

    this.logger.warn('SEFAZ DF-e provider is configured but SOAP/mTLS download is not implemented yet.');
    return {
      status: FiscalFetchStatus.Failed,
      accessKey: request.accessKey,
      documentType,
      sourceType: ExpenseSourceType.Xml,
      message: 'SEFAZ DF-e SOAP/mTLS XML download provider is configured but not implemented yet.',
    };
  }
}
