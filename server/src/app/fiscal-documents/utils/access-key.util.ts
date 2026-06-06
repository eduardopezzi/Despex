import { FiscalDocumentType } from '@open-receipt-ocr/types';

export function extractFiscalAccessKey(input?: string | null): string | null {
  if (!input) return null;

  const digitsOnly = input.replace(/\D/g, '');
  if (digitsOnly.length < 44) return null;

  const candidates = Array.from({ length: digitsOnly.length - 43 }, (_, index) => digitsOnly.slice(index, index + 44))
    .map((accessKey, index) => ({ accessKey, index, score: scoreAccessKeyCandidate(accessKey) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return candidates[0]?.accessKey ?? digitsOnly.slice(0, 44);
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

function scoreAccessKeyCandidate(accessKey: string): number {
  if (!/^\d{44}$/.test(accessKey)) return 0;

  let score = 0;
  const model = accessKey.slice(20, 22);
  if (model === '55' || model === '65') score += 10;

  const stateCode = accessKey.slice(0, 2);
  const validStateCodes = new Set([
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '21',
    '22',
    '23',
    '24',
    '25',
    '26',
    '27',
    '28',
    '29',
    '31',
    '32',
    '33',
    '35',
    '41',
    '42',
    '43',
    '50',
    '51',
    '52',
    '53',
  ]);
  if (validStateCodes.has(stateCode)) score += 3;

  const month = Number(accessKey.slice(4, 6));
  if (month >= 1 && month <= 12) score += 2;

  const cnpj = accessKey.slice(6, 20);
  if (!/^0{14}$/.test(cnpj)) score += 1;

  return score;
}
