import { describe, expect, it } from 'vitest';
import { ExpenseSourceType, FiscalDocumentType, PaymentType } from '@open-receipt-ocr/types';
import { ExpenseExtractionService } from '@app/expense-extraction/expense-extraction.service';

describe('ExpenseExtractionService', () => {
  const service = new ExpenseExtractionService();

  it('extracts merchant, amount, date, payment and access key from NF-e model 55 XML', () => {
    const rawXml = `
      <nfeProc>
        <NFe>
          <infNFe Id="NFe35260612345678000195550010000000011000000010">
            <ide>
              <mod>55</mod>
              <dhEmi>2026-06-03T10:15:00-03:00</dhEmi>
            </ide>
            <emit>
              <xNome>ACME COMERCIO LTDA</xNome>
            </emit>
            <total>
              <ICMSTot>
                <vNF>123.45</vNF>
              </ICMSTot>
            </total>
            <pag>
              <detPag>
                <tPag>03</tPag>
              </detPag>
            </pag>
          </infNFe>
        </NFe>
      </nfeProc>
    `;

    expect(service.extractFromXml(rawXml)).toEqual({
      documentType: FiscalDocumentType.NfeModel55,
      sourceType: ExpenseSourceType.Xml,
      merchantName: 'ACME COMERCIO LTDA',
      totalAmount: 123.45,
      expenseDate: '2026-06-03',
      paymentType: PaymentType.PersonalCreditCard,
      xmlAccessKey: '35260612345678000195550010000000011000000010',
    });
  });

  it('extracts merchant, amount, date and payment from OCR JSON text', () => {
    const rawOcrJson = JSON.stringify({
      pages: [
        {
          blocks: [
            { text: 'PADARIA CENTRAL LTDA' },
            { text: 'CNPJ 12.345.678/0001-95' },
            { text: 'Data 03/06/2026' },
            { text: 'Valor total R$ 42,50' },
            { text: 'Pagamento cartao credito pessoal' },
          ],
        },
      ],
    });

    expect(service.extractFromOcrJson(rawOcrJson)).toMatchObject({
      documentType: FiscalDocumentType.Unknown,
      sourceType: ExpenseSourceType.OcrJson,
      merchantName: 'PADARIA CENTRAL LTDA',
      totalAmount: 42.5,
      expenseDate: '2026-06-03',
      paymentType: PaymentType.PersonalCreditCard,
    });
  });

  it('does not use fiscal document headers as merchant and detects glued cash payment text', () => {
    const rawOcrJson = JSON.stringify({
      pages: [
        {
          blocks: [
            { text: 'Docmento Auxiliar a Nota Fiscal de' },
            { text: 'Consumidor Eletronica' },
            { text: 'Coc ten.Unit .' },
            { text: '387 BUFFET' },
            { text: 'VALOR TOTAL R$ 102,00' },
            { text: 'PAGAMENTODINHEIROAVALOR TOTAL' },
          ],
        },
      ],
    });

    expect(service.extractFromOcrJson(rawOcrJson)).toMatchObject({
      merchantName: null,
      totalAmount: 102,
      paymentType: PaymentType.Cash,
    });
  });

  it('groups Paddle OCR blocks by visual line before extracting totals', () => {
    const rawOcrJson = JSON.stringify({
      pages: [
        {
          blocks: [
            {
              text: '102,00',
              bbox: [
                [190, 100],
                [240, 100],
                [240, 118],
                [190, 118],
              ],
            },
            {
              text: 'R$',
              bbox: [
                [150, 101],
                [170, 101],
                [170, 118],
                [150, 118],
              ],
            },
            {
              text: 'TOTAL',
              bbox: [
                [20, 99],
                [80, 99],
                [80, 118],
                [20, 118],
              ],
            },
          ],
        },
      ],
    });

    expect(service.extractFromOcrJson(rawOcrJson)).toMatchObject({
      totalAmount: 102,
    });
  });

  it('finds total anchors with OCR character mistakes', () => {
    const rawOcrJson = JSON.stringify({
      pages: [{ blocks: [{ text: 'VAL0R T0TAL R$ 87,65' }] }],
    });

    expect(service.extractFromOcrJson(rawOcrJson)).toMatchObject({
      totalAmount: 87.65,
    });
  });
});
