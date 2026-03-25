import {Injectable} from '@nestjs/common';
import {BaseDao} from '@core/database/base.dao';
import {InvoiceEntity} from '@core/database/entities/invoice.entity';
import {ReposService} from '@core/database/repos.service';
import {InvoiceStatus} from '@core/types/invoice-status.enum';

@Injectable()
export class InvoicesDao extends BaseDao<InvoiceEntity> {
    constructor(repos: ReposService) {
        super(repos.invoice);
    }

    findAllByDateDesc(): Promise<InvoiceEntity[]> {
        return this.repo.find({order: {createdAt: 'DESC'}});
    }

    async createAndEnqueue(filename: string, originalName: string): Promise<InvoiceEntity> {
        return this.create({filename, originalName, status: InvoiceStatus.Pending});
    }

    updateStatus(id: number, status: InvoiceStatus, ocrData?: string | null): Promise<InvoiceEntity> {
        return this.updateByPk(id, {status, ...(ocrData !== undefined && {ocrData})});
    }
}
