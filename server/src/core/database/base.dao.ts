import {NotFoundException} from '@nestjs/common';
import {DeepPartial, FindManyOptions, FindOneOptions, FindOptionsWhere, ObjectLiteral, Repository} from 'typeorm';

/**
 * Generic DAO (Data Access Object) base class.
 *
 * Extend this class in a concrete DAO and pass the TypeORM repository:
 *
 *   @Injectable()
 *   export class InvoicesDao extends BaseDao<InvoiceEntity> {
 *     constructor(repos: ReposService) {
 *       super(repos.invoice);
 *     }
 *   }
 */
export class BaseDao<T extends ObjectLiteral> {
    constructor(protected readonly repo: Repository<T>) {
    }

    /** Primary key property name as declared on the entity class (from TypeORM metadata). */
    private get pkName(): string {
        return this.repo.metadata.primaryColumns[0].propertyName;
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    getAll(options?: FindManyOptions<T>): Promise<T[]> {
        return this.repo.find(options);
    }

    getOne(options: FindOneOptions<T>): Promise<T | null> {
        return this.repo.findOne(options);
    }

    getOneByPk(id: string | number, options?: Omit<FindOneOptions<T>, 'where'>): Promise<T | null> {
        return this.repo.findOne({...options, where: {[this.pkName]: id} as FindOptionsWhere<T>});
    }

    async getOneByPkOrFail(id: string | number, options?: Omit<FindOneOptions<T>, 'where'>): Promise<T> {
        const entity = await this.getOneByPk(id, options);
        if (!entity) {
            throw new NotFoundException(`${this.repo.metadata.name} with id "${id}" not found`);
        }
        return entity;
    }

    // ─── Write ────────────────────────────────────────────────────────────────

    create(data: DeepPartial<T>): Promise<T> {
        const entity = this.repo.create(data);
        return this.repo.save(entity);
    }

    async updateByPk(id: string | number, data: DeepPartial<T>): Promise<T> {
        const entity = await this.getOneByPkOrFail(id);
        const updated = this.repo.merge(entity, data);
        return this.repo.save(updated);
    }

    async deleteByPk(id: string | number): Promise<void> {
        await this.getOneByPkOrFail(id);
        await this.repo.delete({[this.pkName]: id} as FindOptionsWhere<T>);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    count(options?: FindManyOptions<T>): Promise<number> {
        return this.repo.count(options);
    }

    exists(where: FindOptionsWhere<T>): Promise<boolean> {
        return this.repo.existsBy(where);
    }
}
