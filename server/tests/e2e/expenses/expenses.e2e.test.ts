import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseModule } from '@core/database/database.module';
import { ExpensesModule } from '@app/expenses/expenses.module';
import { ExpenseEntity } from '@core/database/entities/expense.entity';
import { ExpenseSourceType, FiscalDocumentType, PaginatedResponse, PaymentType } from '@open-receipt-ocr/types';
import { TestContextHelpers } from '@tests/test-context.helpers';
import { TestHelpers } from '@tests/test-helpers';

describe('Expenses Controller (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const context = await TestContextHelpers.createTestContext({
      imports: [DatabaseModule, ExpensesModule],
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
});
