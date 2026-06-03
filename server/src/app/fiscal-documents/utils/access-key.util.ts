import { FiscalDocumentType } from '@open-receipt-ocr/types';

export function extractFiscalAccessKey(input?: string | null): string | null {
  if (!input) return null;

  const digitsOnly = input.replace(/\D/g, '');
  const match = digitsOnly.match(/\d{44}/);
  return match?.[0] ?? null;
}

export function getFiscalDocumentTypeFromAccessKey(accessKey: string): FiscalDocumentType {
  if (!/^\d{44}$/.test(accessKey)) {
    return FiscalDocumentType.Unknown;
  }

  const model = accessKey.slice(20, 22);
  if (model === '55') return FiscalDocumentType.NfeModel55;
  if (model === '65') return FiscalDocumentType.ConsumerInvoice;
  return FiscalDocumentType.Unknown;
}
