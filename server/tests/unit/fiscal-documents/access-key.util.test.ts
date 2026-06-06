import { describe, expect, it } from 'vitest';
import { FiscalDocumentType } from '@open-receipt-ocr/types';
import { extractFiscalAccessKey, getFiscalDocumentTypeFromAccessKey } from '@app/fiscal-documents/utils/access-key.util';

describe('access-key.util', () => {
  const nfeAccessKey = '35260612345678000195550010000000011000000010';

  it('extracts a 44-digit access key from formatted text', () => {
    const text = `Chave de acesso: 3526 0612 3456 7800 0195 5500 1000 0000 0110 0000 0010`;

    expect(extractFiscalAccessKey(text)).toBe(nfeAccessKey);
  });

  it('prefers a plausible NF-e/NFC-e key when OCR text has unrelated numbers before it', () => {
    const text = `1 425 VALOR TOTAL R$ 102,00 chave 4226 0580 9863 9100 0102 6500 1000 2078 0417 9428 4779`;

    expect(extractFiscalAccessKey(text)).toBe('42260580986391000102650010002078041794284779');
  });

  it('detects NF-e model 55 from the access key model segment', () => {
    expect(getFiscalDocumentTypeFromAccessKey(nfeAccessKey)).toBe(FiscalDocumentType.NfeModel55);
  });

  it('returns unknown for invalid keys', () => {
    expect(extractFiscalAccessKey('no fiscal key here')).toBeNull();
    expect(getFiscalDocumentTypeFromAccessKey('123')).toBe(FiscalDocumentType.Unknown);
  });
});
