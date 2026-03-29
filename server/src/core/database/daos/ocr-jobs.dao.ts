import { Injectable } from '@nestjs/common';
import { BaseDao } from '@core/database/base.dao';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';
import { ReposService } from '@core/database/repos.service';
import { NoTxn, TxnDef } from '@core/database/txn-def.interface';

@Injectable()
export class OcrJobsDao extends BaseDao<OcrJobEntity> {
  constructor(repos: ReposService) {
    super(repos.ocrJob);
  }

  findAllWithRelations(txnDef: TxnDef = NoTxn): Promise<OcrJobEntity[]> {
    return this.repositoryWithTxnDef(txnDef).find({
      relations: ['files', 'files.executions'],
      order: { createdAt: 'DESC' },
    });
  }

  findOneWithRelations(txnDef: TxnDef = NoTxn, id: number): Promise<OcrJobEntity | null> {
    return this.repositoryWithTxnDef(txnDef).findOne({
      where: { id },
      relations: ['files', 'files.executions'],
    });
  }
}
