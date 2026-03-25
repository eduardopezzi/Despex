import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InvoicesService } from './invoices.service';
import { InvoiceStatus } from './invoice.entity';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

@Processor('ocr-queue')
export class OCRProcessor extends WorkerHost {
  private readonly logger = new Logger(OCRProcessor.name);

  constructor(private readonly invoicesService: InvoicesService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { invoiceId } = job.data;
    this.logger.log(`Processing OCR for invoice ${invoiceId}`);

    const invoice = await this.invoicesService.findOne(invoiceId);
    if (!invoice) {
      this.logger.error(`Invoice ${invoiceId} not found`);
      return;
    }

    try {
      await this.invoicesService.updateStatus(invoiceId, InvoiceStatus.PROCESSING);
      
      const filePath = path.join('./uploads', invoice.filename);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File ${filePath} not found`);
      }

      // Read file and convert to base64
      const fileBuffer = fs.readFileSync(filePath);
      const base64Content = fileBuffer.toString('base64');
      const fileExt = path.extname(invoice.filename).toLowerCase();
      const mimeType = this.getMimeType(fileExt);

      const mistralApiKey = process.env.MISTRAL_API_KEY;
      if (!mistralApiKey) {
        throw new Error('MISTRAL_API_KEY is not set');
      }

      this.logger.log(`Calling Mistral OCR API for invoice ${invoiceId}`);
      
      const response = await axios.post(
        'https://api.mistral.ai/v1/ocr',
        {
          model: 'mistral-ocr-latest',
          document: {
            type: 'document_content',
            document_content: base64Content,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${mistralApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const ocrResult = JSON.stringify(response.data);
      await this.invoicesService.updateStatus(invoiceId, InvoiceStatus.COMPLETED, ocrResult);
      this.logger.log(`Successfully processed invoice ${invoiceId}`);
    } catch (error) {
      this.logger.error(`Failed to process invoice ${invoiceId}: ${error.message}`);
      await this.invoicesService.updateStatus(invoiceId, InvoiceStatus.FAILED);
      throw error;
    }
  }

  private getMimeType(ext: string): string {
    switch (ext) {
      case '.pdf': return 'application/pdf';
      case '.jpg':
      case '.jpeg': return 'image/jpeg';
      case '.png': return 'image/png';
      default: return 'application/octet-stream';
    }
  }
}
