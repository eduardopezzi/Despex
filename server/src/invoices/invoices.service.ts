import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from './invoice.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectQueue('ocr-queue')
    private readonly ocrQueue: Queue,
  ) {}

  async create(filename: string, originalName: string): Promise<Invoice> {
    const invoice = this.invoiceRepository.create({
      filename,
      originalName,
      status: InvoiceStatus.PENDING,
    });
    const savedInvoice = await this.invoiceRepository.save(invoice);
    
    // Add to OCR queue
    await this.ocrQueue.add('process-ocr', { invoiceId: savedInvoice.id });
    this.logger.log(`Added invoice ${savedInvoice.id} to OCR queue`);
    
    return savedInvoice;
  }

  async findAll(): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Invoice | null> {
    return this.invoiceRepository.findOneBy({ id });
  }

  async updateStatus(id: number, status: InvoiceStatus, ocrData?: string): Promise<void> {
    await this.invoiceRepository.update(id, { status, ocrData });
  }
}
