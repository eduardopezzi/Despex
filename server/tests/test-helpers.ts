import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { expect } from 'vitest';

export class TestHelpers {
  static async expectOk<T>(app: INestApplication, endpoint: string): Promise<T> {
    const res = await request(app.getHttpServer()).get(endpoint);
    expect(res.status).toBe(HttpStatus.OK);
    return res.body as T;
  }

  static async expectCreated<T>(app: INestApplication, endpoint: string, payload?: any): Promise<T> {
    const res = await request(app.getHttpServer()).post(endpoint).send(payload);
    expect(res.status).toBe(HttpStatus.CREATED);
    return res.body as T;
  }

  static async expectNotFound(app: INestApplication, endpoint: string): Promise<any> {
    const res = await request(app.getHttpServer()).get(endpoint);
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
    return res.body;
  }

  static async expectBadRequest(app: INestApplication, endpoint: string, payload?: any): Promise<any> {
    const res = await request(app.getHttpServer()).post(endpoint).send(payload);
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    return res.body;
  }

  static async expectBadRequestGet(app: INestApplication, endpoint: string): Promise<any> {
    const res = await request(app.getHttpServer()).get(endpoint);
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    return res.body;
  }

  static async expectUpload<T>(
    app: INestApplication,
    endpoint: string,
    fields: Record<string, string>,
    file: { name: string; filename: string; content: string | Buffer; contentType: string },
  ): Promise<T> {
    const req = request(app.getHttpServer()).post(endpoint);

    for (const [key, value] of Object.entries(fields)) {
      req.field(key, value);
    }

    req.attach(file.name, file.content instanceof Buffer ? file.content : Buffer.from(file.content), {
      filename: file.filename,
      contentType: file.contentType,
    });

    const res = await req;
    expect(res.status).toBe(HttpStatus.CREATED);
    return res.body as T;
  }

  static async expectMultiFileUpload<T>(
    app: INestApplication,
    endpoint: string,
    fields: Record<string, string>,
    files: Array<{ name: string; filename: string; content: string | Buffer; contentType: string }>,
  ): Promise<T> {
    const req = request(app.getHttpServer()).post(endpoint);

    for (const [key, value] of Object.entries(fields)) {
      req.field(key, value);
    }

    for (const file of files) {
      req.attach(file.name, file.content instanceof Buffer ? file.content : Buffer.from(file.content), {
        filename: file.filename,
        contentType: file.contentType,
      });
    }

    const res = await req;
    expect(res.status).toBe(HttpStatus.CREATED);
    return res.body as T;
  }

  static async expectBadRequestUpload(
    app: INestApplication,
    endpoint: string,
    fields: Record<string, string>,
    file: { name: string; filename: string; content: string | Buffer; contentType: string },
  ): Promise<any> {
    const req = request(app.getHttpServer()).post(endpoint);

    for (const [key, value] of Object.entries(fields)) {
      req.field(key, value);
    }

    req.attach(file.name, file.content instanceof Buffer ? file.content : Buffer.from(file.content), {
      filename: file.filename,
      contentType: file.contentType,
    });

    const res = await req;
    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
    return res.body;
  }

  static async expectDelete(app: INestApplication, endpoint: string): Promise<void> {
    const res = await request(app.getHttpServer()).delete(endpoint);
    expect(res.status).toBe(HttpStatus.OK);
  }
}
