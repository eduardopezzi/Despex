import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseModule } from '@core/database/database.module';
import { ExpensesModule } from '@app/expenses/expenses.module';
import { RecordsModule } from '@app/records/records.module';
import { ExpenseEntity } from '@core/database/entities/expense.entity';
import { ExpenseSourceType, FiscalDocumentType, FiscalFetchStatus, PaginatedResponse, PaymentType, RecordType } from '@open-receipt-ocr/types';
import { TestContextHelpers } from '@tests/test-context.helpers';
import { TestHelpers } from '@tests/test-helpers';

describe('Expenses Controller (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const context = await TestContextHelpers.createTestContext({
      imports: [DatabaseModule, ExpensesModule, RecordsModule],
    });
    app = context.app;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/expenses (GET) - empty', async () => {
    const body = await TestHelpers.expectOk<PaginatedResponse<ExpenseEntity>>(app, '/expenses');

    expect(body.data).toBeArray();
    expect(body.data).toBeEmpty();
    expect(body.total).toBe(0);
  });

  it('/expenses (POST, GET, PATCH, DELETE) - CRUD', async () => {
    const created = await TestHelpers.expectCreated<ExpenseEntity>(app, '/expenses', {
      documentType: FiscalDocumentType.Receipt,
      sourceType: ExpenseSourceType.OcrJson,
      merchantName: 'Padaria Central',
      totalAmount: 42.5,
      expenseDate: '2026-06-03',
      paymentType: PaymentType.PersonalCreditCard,
      isCompanyExpense: false,
      description: 'Cafe com cliente',
    });

    expect(created).toMatchObject({
      merchantName: 'Padaria Central',
      totalAmount: 42.5,
      paymentType: PaymentType.PersonalCreditCard,
    });

    const detail = await TestHelpers.expectOk<ExpenseEntity>(app, `/expenses/${created.id}`);
    expect(detail.id).toBe(created.id);

    const patchRes = await request(app.getHttpServer()).patch(`/expenses/${created.id}`).send({
      merchantName: 'Padaria Central Corrigida',
      isReimbursed: true,
      reimbursementDate: '2026-06-10',
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body).toMatchObject({
      merchantName: 'Padaria Central Corrigida',
      isReimbursed: true,
      reimbursementDate: '2026-06-10',
    });

    await TestHelpers.expectDelete(app, `/expenses/${created.id}`);
    await TestHelpers.expectNotFound(app, `/expenses/${created.id}`);
  });

  it('/expenses (GET) - filters by reimbursement status and date range', async () => {
    await TestHelpers.expectCreated<ExpenseEntity>(app, '/expenses', {
      merchantName: 'Hotel Alpha',
      totalAmount: 200,
      expenseDate: '2026-06-01',
      isReimbursed: true,
      reimbursementDate: '2026-06-05',
    });

    await TestHelpers.expectCreated<ExpenseEntity>(app, '/expenses', {
      merchantName: 'Taxi Beta',
      totalAmount: 80,
      expenseDate: '2026-07-01',
      isReimbursed: false,
    });

    const reimbursed = await TestHelpers.expectOk<PaginatedResponse<ExpenseEntity>>(app, '/expenses?isReimbursed=true');
    expect(reimbursed.total).toBe(1);
    expect(reimbursed.data[0].merchantName).toBe('Hotel Alpha');

    const june = await TestHelpers.expectOk<PaginatedResponse<ExpenseEntity>>(app, '/expenses?expenseDateFrom=2026-06-01&expenseDateTo=2026-06-30');
    expect(june.total).toBe(1);
    expect(june.data[0].merchantName).toBe('Hotel Alpha');
  });

  it('/expenses (POST) - detects fiscal access key and records lookup status', async () => {
    const accessKey = '35260612345678000195550010000000011000000010';

    const created = await TestHelpers.expectCreated<ExpenseEntity>(app, '/expenses', {
      rawOcrJson: `OCR result with chave de acesso ${accessKey}`,
      sourceType: ExpenseSourceType.OcrJson,
    });

    expect(created).toMatchObject({
      xmlAccessKey: accessKey,
      documentType: FiscalDocumentType.NfeModel55,
      officialLookupStatus: FiscalFetchStatus.NotAttempted,
    });
    expect(created.officialLookupMessage).toContain('Fiscal lookup is disabled');
  });

  it('/expenses (POST) - extracts business fields from NF-e XML', async () => {
    const created = await TestHelpers.expectCreated<ExpenseEntity>(app, '/expenses', {
      rawXml: `
        <nfeProc>
          <NFe>
            <infNFe Id="NFe35260612345678000195550010000000011000000010">
              <ide><mod>55</mod><dhEmi>2026-06-03T10:15:00-03:00</dhEmi></ide>
              <emit><xNome>ACME COMERCIO LTDA</xNome></emit>
              <total><ICMSTot><vNF>123.45</vNF></ICMSTot></total>
              <pag><detPag><tPag>01</tPag></detPag></pag>
            </infNFe>
          </NFe>
        </nfeProc>
      `,
    });

    expect(created).toMatchObject({
      documentType: FiscalDocumentType.NfeModel55,
      sourceType: ExpenseSourceType.Xml,
      merchantName: 'ACME COMERCIO LTDA',
      totalAmount: 123.45,
      expenseDate: '2026-06-03',
      paymentType: PaymentType.Cash,
      xmlAccessKey: '35260612345678000195550010000000011000000010',
    });
  });

  it('/expenses (POST) - extracts business fields from receipt OCR JSON', async () => {
    const created = await TestHelpers.expectCreated<ExpenseEntity>(app, '/expenses', {
      rawOcrJson: JSON.stringify({
        pages: [
          { blocks: [{ text: 'POSTO AVENIDA LTDA' }, { text: 'Data 04/06/2026' }, { text: 'TOTAL R$ 89,90' }, { text: 'Pagamento dinheiro' }] },
        ],
      }),
      sourceType: ExpenseSourceType.OcrJson,
    });

    expect(created).toMatchObject({
      documentType: FiscalDocumentType.Unknown,
      sourceType: ExpenseSourceType.OcrJson,
      merchantName: 'POSTO AVENIDA LTDA',
      totalAmount: 89.9,
      expenseDate: '2026-06-04',
      paymentType: PaymentType.Cash,
    });
  });

  it('/expenses/:id/reextract (PATCH) - recalculates stored OCR fields', async () => {
    const created = await TestHelpers.expectCreated<ExpenseEntity>(app, '/expenses', {
      rawOcrJson: JSON.stringify({
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
      }),
      merchantName: 'Docmento Auxiliar a Nota Fiscal de',
      paymentType: PaymentType.Unknown,
    });

    const patchRes = await request(app.getHttpServer()).patch(`/expenses/${created.id}/reextract`).send({});
    expect(patchRes.status).toBe(200);
    expect(patchRes.body).toMatchObject({
      merchantName: null,
      totalAmount: 102,
      paymentType: PaymentType.Cash,
    });
  });

  it('/expenses/extraction-feedback (GET) - records manual corrections for extracted fields', async () => {
    const created = await TestHelpers.expectCreated<ExpenseEntity>(app, '/expenses', {
      rawOcrJson: JSON.stringify({
        pages: [{ blocks: [{ text: 'PADARIA CENTRAL LTDA' }, { text: 'TOTAL R$ 42,50' }, { text: 'Pagamento dinheiro' }] }],
      }),
      sourceType: ExpenseSourceType.OcrJson,
    });

    const patchRes = await request(app.getHttpServer()).patch(`/expenses/${created.id}`).send({
      merchantName: 'Padaria Central Corrigida',
      totalAmount: 43.5,
    });
    expect(patchRes.status).toBe(200);

    const feedback = await TestHelpers.expectOk<PaginatedResponse<Record<string, unknown>>>(app, '/expenses/extraction-feedback?page=1&pageSize=10');
    expect(feedback.total).toBeGreaterThan(0);
    expect(feedback.data[0]).toMatchObject({
      expenseId: created.id,
      predictedMerchantName: 'PADARIA CENTRAL LTDA',
      correctedMerchantName: 'Padaria Central Corrigida',
      predictedTotalAmount: 42.5,
      correctedTotalAmount: 43.5,
    });
  });

  it('/expenses (POST/PATCH) - learns merchant aliases from corrected OCR data', async () => {
    const first = await TestHelpers.expectCreated<ExpenseEntity>(app, '/expenses', {
      rawOcrJson: JSON.stringify({
        pages: [
          {
            blocks: [
              { text: 'F0SCRESIDENCIA' },
              { text: 'CNPJ: 30.986.391/0001-02' },
              { text: 'VALOR TOTAL R$ 102,00' },
              { text: 'PAGAMENTODINHEIROAVALOR TOTAL' },
            ],
          },
        ],
      }),
      sourceType: ExpenseSourceType.OcrJson,
    });

    expect(first).toMatchObject({
      merchantName: null,
      merchantTaxId: '30986391000102',
      totalAmount: 102,
      paymentType: PaymentType.Cash,
    });

    const patchRes = await request(app.getHttpServer()).patch(`/expenses/${first.id}`).send({
      merchantName: 'CHURRASCARIA E LANCHERIA CAXIAS LTDA',
    });
    expect(patchRes.status).toBe(200);

    const second = await TestHelpers.expectCreated<ExpenseEntity>(app, '/expenses', {
      rawOcrJson: JSON.stringify({
        pages: [
          {
            blocks: [
              { text: 'SCRESIDENCIA' },
              { text: 'CNPJ: 30.986.391/0001-02' },
              { text: 'TOTAL R$ 58,00' },
            ],
          },
        ],
      }),
      sourceType: ExpenseSourceType.OcrJson,
    });

    expect(second).toMatchObject({
      merchantName: 'CHURRASCARIA E LANCHERIA CAXIAS LTDA',
      merchantTaxId: '30986391000102',
      totalAmount: 58,
    });
  });

  it('/expenses (POST) - accepts valid client and expense type records', async () => {
    const client = await TestHelpers.expectCreated<{ id: number }>(app, '/records', {
      name: 'Cliente Despex',
      type: RecordType.Client,
    });
    const expenseType = await TestHelpers.expectCreated<{ id: number }>(app, '/records', {
      name: 'Transporte',
      type: RecordType.ExpenseType,
    });

    const created = await TestHelpers.expectCreated<ExpenseEntity>(app, '/expenses', {
      merchantName: 'Taxi Gamma',
      clientRecordId: client.id,
      expenseTypeRecordId: expenseType.id,
    });

    expect(created).toMatchObject({
      merchantName: 'Taxi Gamma',
      clientRecordId: client.id,
      expenseTypeRecordId: expenseType.id,
    });
  });
});
