import { Injectable } from '@nestjs/common';
import { BaseDao } from '@core/database/base.dao';
import { ReceiptEntity } from '@core/database/entities/receipt.entity';
import { ReposService } from '@core/database/repos.service';
import { ReceiptStatus } from '@core/types/receipt-status.enum';

@Injectable()
export class ReceiptsDao extends BaseDao<ReceiptEntity> {
  constructor(repos: ReposService) {
    super(repos.receipt);
  }

  findAllByDateDesc(): Promise<ReceiptEntity[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  updateStatus(id: number, status: ReceiptStatus, ocrData?: string | null): Promise<ReceiptEntity> {
    return this.updateByPk(id, {
      status,
      ...(ocrData !== undefined && { ocrData }),
    });
  }
}
