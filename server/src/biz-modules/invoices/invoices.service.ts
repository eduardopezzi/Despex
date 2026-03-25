import {Injectable, Logger} from '@nestjs/common';
import {InvoicesDao} from '@biz-modules/invoices/invoices.dao';
import {InvoiceEntity} from '@core/database/entities/invoice.entity';
import {InjectQueue} from '@nestjs/bullmq';
import {Queue} from 'bullmq';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly invoicesDao: InvoicesDao,
    @InjectQueue('ocr-queue') private readonly ocrQueue: Queue,
  ) {
  }

  findAll(): Promise<InvoiceEntity[]> {
    return this.invoicesDao.findAllByDateDesc();
  }

  findOneOrFail(id: number): Promise<InvoiceEntity> {
    return this.invoicesDao.getOneByPkOrFail(id);
  }

  async upload(filename: string, originalName: string): Promise<InvoiceEntity> {
    const invoice = await this.invoicesDao.createAndEnqueue(
      filename,
      originalName,
    );
    await this.ocrQueue.add('process-ocr', {invoiceId: invoice.id});
    this.logger.log(`Invoice #${invoice.id} queued for OCR`);
    return invoice;
  }
}
