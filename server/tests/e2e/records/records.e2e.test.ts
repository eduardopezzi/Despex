import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseModule } from '@core/database/database.module';
import { RecordsModule } from '@app/records/records.module';
import { RecordEntity } from '@core/database/entities/record.entity';
import { PaginatedResponse, RecordType } from '@open-receipt-ocr/types';
import { TestContextHelpers } from '@tests/test-context.helpers';
import { TestHelpers } from '@tests/test-helpers';

describe('Records Controller (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const context = await TestContextHelpers.createTestContext({
      imports: [DatabaseModule, RecordsModule],
    });
    app = context.app;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('/records (GET) - empty', async () => {
    const body = await TestHelpers.expectOk<PaginatedResponse<RecordEntity>>(app, '/records');

    expect(body.data).toBeArray();
    expect(body.data).toBeEmpty();
    expect(body.total).toBe(0);
  });

  it('/records (POST, GET, PATCH, DELETE) - CRUD with soft delete', async () => {
    const created = await TestHelpers.expectCreated<RecordEntity>(app, '/records', {
      name: 'Cliente XPTO',
      type: RecordType.Client,
    });

    expect(created).toMatchObject({
      name: 'Cliente XPTO',
      type: RecordType.Client,
      isActive: true,
    });

    const filtered = await TestHelpers.expectOk<PaginatedResponse<RecordEntity>>(app, `/records?type=${RecordType.Client}&search=XPTO`);
    expect(filtered.total).toBe(1);

    const patchRes = await request(app.getHttpServer()).patch(`/records/${created.id}`).send({ name: 'Cliente XPTO Atualizado' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.name).toBe('Cliente XPTO Atualizado');

    const deleteRes = await request(app.getHttpServer()).delete(`/records/${created.id}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.isActive).toBe(false);
  });
});
