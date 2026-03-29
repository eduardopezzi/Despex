import { Injectable } from '@nestjs/common';
import { BaseDao } from '@core/database/base.dao';
import { ReceiptEntity } from '@core/database/entities/receipt.entity';
import { ReposService } from '@core/database/repos.service';
import { ReceiptStatus } from '@core/types/receipt-status.enum';
import { NoTxn, TxnDef } from '@core/database/txn-def.interface';

@Injectable()
export class ReceiptsDao extends BaseDao<ReceiptEntity> {
  constructor(repos: ReposService) {
    super(repos.receipt);
  }

  findAllByDateDesc(txnDef: TxnDef = NoTxn): Promise<ReceiptEntity[]> {
    return this.repositoryWithTxnDef(txnDef).find({ order: { createdAt: 'DESC' } });
  }

  updateStatus(txnDef: TxnDef, id: number, status: ReceiptStatus, ocrData?: string | null): Promise<ReceiptEntity> {
    return this.updateByPk(txnDef, id, {
      status,
      ...(ocrData !== undefined && { ocrData }),
    });
  }
}
