import { Injectable } from '@nestjs/common';
import { Brackets } from 'typeorm';
import { BaseDao } from '@core/database/base.dao';
import { RecordEntity } from '@core/database/entities/record.entity';
import { ReposService } from '@core/database/repos.service';
import { NoTxn, TxnDef } from '@core/database/txn-def.interface';
import { RecordType, SortOrder } from '@open-receipt-ocr/types';

@Injectable()
export class RecordsDao extends BaseDao<RecordEntity> {
  constructor(repos: ReposService) {
    super(repos.record);
  }

  findAll(
    txnDef: TxnDef = NoTxn,
    options: {
      skip?: number;
      take?: number;
      type?: RecordType;
      isActive?: boolean;
      search?: string;
      sortField?: keyof RecordEntity;
      sortOrder?: SortOrder;
    } = {},
  ): Promise<[RecordEntity[], number]> {
    const { skip, take, type, isActive, search, sortField = 'name', sortOrder = SortOrder.ASC } = options;
    const qb = this.repositoryWithTxnDef(txnDef).createQueryBuilder('record');

    if (type) {
      qb.andWhere('record.type = :type', { type });
    }
    if (isActive !== undefined) {
      qb.andWhere('record.isActive = :isActive', { isActive });
    }
    if (search) {
      const searchTerm = `%${search}%`;
      qb.andWhere(
        new Brackets((innerQb) => {
          innerQb.where('record.name LIKE :search', { search: searchTerm });
        }),
      );
    }

    qb.orderBy(`record.${sortField}`, sortOrder);
    if (sortField !== 'id') {
      qb.addOrderBy('record.id', 'DESC');
    }

    if (skip !== undefined) qb.skip(skip);
    if (take !== undefined) qb.take(take);

    return qb.getManyAndCount();
  }
}
