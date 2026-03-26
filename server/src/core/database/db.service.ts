import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

/**
 * Generic database service providing transaction support.
 *
 * Usage:
 *   const result = await this.db.transaction(async (em) => {
 *     const invoice = await em.findOneByOrFail(InvoiceEntity, { id });
 *     invoice.status = InvoiceStatus.Completed;
 *     return em.save(invoice);
 *   });
 */
@Injectable()
export class DbService {
  constructor(private readonly dataSource: DataSource) {}

  transaction<T>(work: (em: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(work);
  }
}
