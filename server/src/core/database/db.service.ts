import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

/**
 * Generic database service providing transaction support.
 *
 * Usage:
 *   const result = await this.db.transaction(async (em) => {
 *     const receipt = await em.findOneByOrFail(ReceiptEntity, { id });
 *     receipt.status = ReceiptStatus.Completed;
 *     return em.save(receipt);
 *   });
 */
@Injectable()
export class DbService {
  constructor(private readonly dataSource: DataSource) {}

  transaction<T>(work: (em: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(work);
  }
}
