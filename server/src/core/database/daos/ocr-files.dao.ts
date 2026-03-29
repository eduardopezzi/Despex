import { Injectable } from '@nestjs/common';
import { BaseDao } from '@core/database/base.dao';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';
import { ReposService } from '@core/database/repos.service';
import { NoTxn, TxnDef } from '@core/database/txn-def.interface';

@Injectable()
export class OcrFilesDao extends BaseDao<OcrFileEntity> {
  constructor(repos: ReposService) {
    super(repos.ocrFile);
  }

  findOneWithExecutions(txnDef: TxnDef = NoTxn, id: number): Promise<OcrFileEntity | null> {
    return this.repositoryWithTxnDef(txnDef).findOne({
      where: { id },
      relations: ['executions'],
    });
  }
}
