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
      merchantTaxId: null,
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
      merchantTaxId: '12345678000195',
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

  it('groups OCR blocks when bbox is an object with x, y, width and height', () => {
    const rawOcrJson = JSON.stringify({
      pages: [
        {
          blocks: [
            { text: '102,00', bbox: { x: 190, y: 100, width: 50, height: 18 } },
            { text: 'R$', bbox: { x: 150, y: 101, width: 20, height: 17 } },
            { text: 'TOTAL', bbox: { x: 20, y: 99, width: 60, height: 19 } },
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

  it('uses fiscal QR Code URL stored in OCR JSON as an extraction source', () => {
    const accessKey = '42260580986391000102650010002078041794284779';
    const fiscalQrCodeUrl = `https://sat.sef.sc.gov.br/nfce/consulta?p=${accessKey}|2|1|abc`;
    const rawOcrJson = JSON.stringify({
      fiscalQrCodeUrl,
      pages: [{ blocks: [{ text: 'TOTAL R$ 18,90' }] }],
    });

    expect(service.extractFromOcrJson(rawOcrJson)).toMatchObject({
      documentType: FiscalDocumentType.ConsumerInvoice,
      fiscalQrCodeUrl,
      xmlAccessKey: accessKey,
      totalAmount: 18.9,
    });
  });

  it('extracts NFC-e tax id, payment and avoids broken merchant fragments from the provided receipt pattern', () => {
    const rawOcrJson = JSON.stringify({
      pages: [
        {
          blocks: [
            { text: 'F0SCRESIDENCIA', bbox: { x: 20, y: 20, width: 130, height: 18 } },
            { text: 'CNPJ: 30.986.391/0001-02 IE: 251760090', bbox: { x: 20, y: 42, width: 360, height: 18 } },
            { text: 'VALOR TOTAL R$ 102,00', bbox: { x: 20, y: 110, width: 220, height: 18 } },
            { text: 'PAGAMENTODINHEIROAVALOR TOTAL', bbox: { x: 20, y: 135, width: 300, height: 18 } },
            { text: 'Data de autorizacao 17/05/2026 19:28:33', bbox: { x: 20, y: 160, width: 360, height: 18 } },
          ],
        },
      ],
    });

    expect(service.extractFromOcrJson(rawOcrJson)).toMatchObject({
      merchantName: null,
      merchantTaxId: '30986391000102',
      totalAmount: 102,
      expenseDate: '2026-05-17',
      paymentType: PaymentType.Cash,
    });
  });
});
