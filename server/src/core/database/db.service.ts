import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
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
export class DbService implements OnModuleInit {
  private readonly logger = new Logger(DbService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    // Enable WAL mode for better concurrency with multiple processes
    await this.dataSource.query('PRAGMA journal_mode = WAL;');
    await this.dataSource.query('PRAGMA synchronous = NORMAL;');
    this.logger.log('Database initialized with WAL mode enabled.');
  }

  transaction<T>(work: (em: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(work);
  }
}
