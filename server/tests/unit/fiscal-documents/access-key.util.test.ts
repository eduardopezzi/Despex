import { describe, expect, it } from 'vitest';
import { FiscalDocumentType } from '@open-receipt-ocr/types';
import { extractFiscalAccessKey, getFiscalDocumentTypeFromAccessKey } from '@app/fiscal-documents/utils/access-key.util';

describe('access-key.util', () => {
  const nfeAccessKey = '35260612345678000195550010000000011000000010';

  it('extracts a 44-digit access key from formatted text', () => {
    const text = `Chave de acesso: 3526 0612 3456 7800 0195 5500 1000 0000 0110 0000 0010`;

    expect(extractFiscalAccessKey(text)).toBe(nfeAccessKey);
  });

  it('detects NF-e model 55 from the access key model segment', () => {
    expect(getFiscalDocumentTypeFromAccessKey(nfeAccessKey)).toBe(FiscalDocumentType.NfeModel55);
  });

  it('returns unknown for invalid keys', () => {
    expect(extractFiscalAccessKey('no fiscal key here')).toBeNull();
    expect(getFiscalDocumentTypeFromAccessKey('123')).toBe(FiscalDocumentType.Unknown);
  });
});
