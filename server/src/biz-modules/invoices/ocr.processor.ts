import {Processor, WorkerHost} from '@nestjs/bullmq';
import {Logger} from '@nestjs/common';
import {Job} from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import {InvoicesDao} from '@biz-modules/invoices/invoices.dao';
import {InvoiceStatus} from '@core/types/invoice-status.enum';
import {AppSecret} from '@core/types/app-secret.enum';

@Processor('ocr-queue')
export class OcrProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(private readonly invoicesDao: InvoicesDao) {
    super();
  }

  async process(job: Job<{ invoiceId: number }>): Promise<void> {
    const {invoiceId} = job.data;
    this.logger.log(`Processing OCR for invoice #${invoiceId}`);

    const invoice = await this.invoicesDao.getOneByPk(invoiceId);
    if (!invoice) {
      this.logger.error(`Invoice #${invoiceId} not found — skipping`);
      return;
    }

    try {
      await this.invoicesDao.updateStatus(invoiceId, InvoiceStatus.Processing);

      const filePath = path.join('./uploads', invoice.filename);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found on disk: ${filePath}`);
      }

      const mistralApiKey = process.env[AppSecret.MistralApiKey];
      if (!mistralApiKey) {
        throw new Error(`Secret "${AppSecret.MistralApiKey}" is not set`);
      }

      const base64Content = fs.readFileSync(filePath).toString('base64');
      const mimeType = OcrProcessor.getMimeType(
          path.extname(invoice.filename).toLowerCase(),
      );

      this.logger.log(`Calling Mistral OCR API for invoice #${invoiceId}`);

      const response = await axios.post(
          'https://api.mistral.ai/v1/ocr',
          {
            model: 'mistral-ocr-latest',
            document: {
              type: 'document_content',
              document_content: base64Content,
              document_media_type: mimeType,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${mistralApiKey}`,
              'Content-Type': 'application/json',
            },
          },
      );

      await this.invoicesDao.updateStatus(
          invoiceId,
          InvoiceStatus.Completed,
          JSON.stringify(response.data),
      );
      this.logger.log(`Successfully completed OCR for invoice #${invoiceId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`OCR failed for invoice #${invoiceId}: ${message}`);
      await this.invoicesDao.updateStatus(invoiceId, InvoiceStatus.Failed);
      throw error;
    }
  }

  private static getMimeType(ext: string): string {
    switch (ext) {
      case '.pdf':
        return 'application/pdf';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      default:
        return 'application/octet-stream';
    }
  }
}
