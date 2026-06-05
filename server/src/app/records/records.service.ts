import { Injectable } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { RecordsDao } from '@core/database/daos/records.dao';
import { RecordEntity } from '@core/database/entities/record.entity';
import { NoTxn } from '@core/database/txn-def.interface';
import { CreateRecordDto } from '@app/records/dto/create-record.dto';
import { RecordQueryParams } from '@app/records/dto/record-query.params';
import { UpdateRecordDto } from '@app/records/dto/update-record.dto';
import { SortOrder } from '@open-receipt-ocr/types';

@Injectable()
export class RecordsService {
  constructor(private readonly recordsDao: RecordsDao) {}

  findAll(params: RecordQueryParams): Promise<[RecordEntity[], number]> {
    const { page, pageSize } = params;
    const skip = page && pageSize ? (page - 1) * pageSize : undefined;

    return this.recordsDao.findAll(NoTxn, {
      ...params,
      skip,
      take: pageSize,
      sortField: params.sortField || 'name',
      sortOrder: params.sortOrder || SortOrder.ASC,
    });
  }

  create(dto: CreateRecordDto): Promise<RecordEntity> {
    return this.recordsDao.create(NoTxn, {
      ...this.toEntityData(dto),
      isActive: dto.isActive ?? true,
    });
  }

  getRecord(id: number): Promise<RecordEntity> {
    return this.recordsDao.getOneByPkOrFail(NoTxn, id);
  }

  update(id: number, dto: UpdateRecordDto): Promise<RecordEntity> {
    return this.recordsDao.updateByPk(NoTxn, id, this.toEntityData(dto));
  }

  deactivate(id: number): Promise<RecordEntity> {
    return this.recordsDao.updateByPk(NoTxn, id, { isActive: false });
  }

  private toEntityData(dto: CreateRecordDto | UpdateRecordDto): DeepPartial<RecordEntity> {
    return {
      ...dto,
      name: dto.name?.trim(),
    };
  }
}
