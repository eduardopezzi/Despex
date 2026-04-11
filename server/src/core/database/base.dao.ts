import { NotFoundException } from '@nestjs/common';
import { DeepPartial, FindManyOptions, FindOneOptions, FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';
import { NoTxn, TxnDef } from '@core/database/txn-def.interface';

/**
 * Generic DAO (Data Access Object) base class.
 *
 * Extend this class in a concrete DAO and pass the TypeORM repository:
 *
 *   @Injectable()
 *   export class SomeDao extends BaseDao<SomeEntity> {
 *     constructor(repos: ReposService) {
 *       super(repos.receipt);
 *     }
 *   }
 */
export class BaseDao<T extends ObjectLiteral> {
  constructor(protected readonly repo: Repository<T>) {}

  protected repositoryWithTxnDef(txnDef: TxnDef | undefined) {
    return txnDef?.txn ? txnDef?.txn.withRepository(this.repo) : this.repo;
  }

  /** Primary key property name as declared on the entity class (from TypeORM metadata). */
  private get pkName(): string {
    return this.repo.metadata.primaryColumns[0].propertyName;
  }

  // ─── Read ─────────────────────────────────────────────────────────────────

  getAll(txnDef: TxnDef = NoTxn, options?: FindManyOptions<T>): Promise<T[]> {
    return this.repositoryWithTxnDef(txnDef).find(options);
  }

  getOne(txnDef: TxnDef = NoTxn, options: FindOneOptions<T>): Promise<T | null> {
    return this.repositoryWithTxnDef(txnDef).findOne(options);
  }

  getOneByPk(txnDef: TxnDef = NoTxn, id: string | number, options?: Omit<FindOneOptions<T>, 'where'>): Promise<T | null> {
    return this.repositoryWithTxnDef(txnDef).findOne({
      ...options,
      where: { [this.pkName]: id } as FindOptionsWhere<T>,
    });
  }

  async getOneByPkOrFail(txnDef: TxnDef = NoTxn, id: string | number, options?: Omit<FindOneOptions<T>, 'where'>): Promise<T> {
    const entity = await this.getOneByPk(txnDef, id, options);
    if (!entity) {
      throw new NotFoundException(`${this.repo.metadata.name} with id "${id}" not found`);
    }
    return entity;
  }

  // ─── Write ────────────────────────────────────────────────────────────────

  create(txnDef: TxnDef = NoTxn, data: DeepPartial<T>): Promise<T> {
    const repo = this.repositoryWithTxnDef(txnDef);
    const entity = repo.create(data);
    return repo.save(entity);
  }

  async updateByPk(txnDef: TxnDef = NoTxn, id: string | number, data: DeepPartial<T>): Promise<T> {
    const entity = await this.getOneByPkOrFail(txnDef, id);
    const repo = this.repositoryWithTxnDef(txnDef);
    const updated = repo.merge(entity, data);
    return repo.save(updated);
  }

  async deleteByPk(txnDef: TxnDef = NoTxn, id: string | number): Promise<void> {
    await this.getOneByPkOrFail(txnDef, id);
    const repo = this.repositoryWithTxnDef(txnDef);
    await repo.delete({ [this.pkName]: id } as FindOptionsWhere<T>);
  }

  async truncate(txnDef: TxnDef = NoTxn): Promise<void> {
    const repo = this.repositoryWithTxnDef(txnDef);
    await repo.clear();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  count(txnDef: TxnDef = NoTxn, options?: FindManyOptions<T>): Promise<number> {
    return this.repositoryWithTxnDef(txnDef).count(options);
  }

  exists(txnDef: TxnDef = NoTxn, where: FindOptionsWhere<T>): Promise<boolean> {
    return this.repositoryWithTxnDef(txnDef).existsBy(where);
  }
}
