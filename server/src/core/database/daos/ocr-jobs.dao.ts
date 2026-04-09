import { Injectable } from '@nestjs/common';
import { BaseDao } from '@core/database/base.dao';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';
import { ReposService } from '@core/database/repos.service';
import { NoTxn, TxnDef } from '@core/database/txn-def.interface';
import { Brackets } from 'typeorm';
import { OcrJobStatus } from '@open-receipt-ocr/types';

@Injectable()
export class OcrJobsDao extends BaseDao<OcrJobEntity> {
  constructor(repos: ReposService) {
    super(repos.ocrJob);
  }

  async findAllWithRelations(
    txnDef: TxnDef = NoTxn,
    options: {
      skip?: number;
      take?: number;
      status?: OcrJobStatus;
      search?: string;
      sort?: 'latest' | 'oldest';
    } = {},
  ): Promise<[OcrJobEntity[], number]> {
    const { skip, take, status, search, sort = 'latest' } = options;

    const qb = this.repositoryWithTxnDef(txnDef)
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.files', 'file')
      .leftJoinAndSelect('file.executions', 'execution');

    if (sort === 'oldest') {
      qb.orderBy('job.createdAt', 'ASC').addOrderBy('job.id', 'ASC');
    } else {
      qb.orderBy('job.createdAt', 'DESC').addOrderBy('job.id', 'DESC');
    }

    if (status) {
      qb.andWhere('job.status = :status', { status });
    }

    if (search) {
      const searchTerm = `%${search}%`;
      qb.andWhere(
        new Brackets((innerQb) => {
          innerQb.where('job.name LIKE :search', { search: searchTerm }).orWhere('file.originalName LIKE :search', { search: searchTerm });
        }),
      );
    }

    if (skip !== undefined) {
      qb.skip(skip);
    }
    if (take !== undefined) {
      qb.take(take);
    }

    return qb.getManyAndCount();
  }

  findOneWithRelations(txnDef: TxnDef = NoTxn, id: number): Promise<OcrJobEntity | null> {
    return this.repositoryWithTxnDef(txnDef).findOne({
      where: { id },
      relations: ['files', 'files.executions'],
    });
  }
}
