import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as fs from 'fs';
import axios from 'axios';
import { extname } from 'path';
import { ReceiptsDao } from '@biz-modules/receipts/receipts.dao';
import { ReceiptStatus } from '@core/types/receipt-status.enum';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { LocalStorageProvider } from '@core/storage/local-storage.provider';
import { MimeType } from '@core/types/mime-type.enum';
import { QueueName } from '@core/types/queue-name.enum';

@Processor(QueueName.Ocr)
export class OcrProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(
    private readonly receiptsDao: ReceiptsDao,
    @Inject(SecretProvider) private readonly secretProvider: SecretProvider,
    private readonly localStorage: LocalStorageProvider,
  ) {
    super();
  }

  async process(job: Job<{ receiptId: number }>): Promise<void> {
    const { receiptId } = job.data;
    this.logger.log(`Processing OCR for receipt #${receiptId}`);

    const receipt = await this.receiptsDao.getOneByPk(receiptId);
    if (!receipt) {
      this.logger.error(`Receipt #${receiptId} not found — skipping`);
      return;
    }

    try {
      await this.receiptsDao.updateStatus(receiptId, ReceiptStatus.Processing);

      const filePath = this.localStorage.getFilePath(receipt.filename);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found on disk: ${filePath}`);
      }

      const mistralApiKey = await this.secretProvider.getSecretOrThrow(
        AppSecret.MistralApiKey,
      );
      const base64Content = fs.readFileSync(filePath).toString('base64');
      const mimeType = OcrProcessor.getMimeType(
        extname(receipt.filename).toLowerCase(),
      );

      this.logger.log(`Calling Mistral OCR API for receipt #${receiptId}`);

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

      await this.receiptsDao.updateStatus(
        receiptId,
        ReceiptStatus.Completed,
        JSON.stringify(response.data),
      );
      this.logger.log(`Successfully completed OCR for receipt #${receiptId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`OCR failed for receipt #${receiptId}: ${message}`);
      await this.receiptsDao.updateStatus(receiptId, ReceiptStatus.Failed);
      throw error;
    }
  }

  private static getMimeType(ext: string): string {
    switch (ext) {
      case '.pdf':
        return MimeType.Pdf;
      case '.jpg':
      case '.jpeg':
        return MimeType.Jpeg;
      case '.png':
        return MimeType.Png;
      default:
        return MimeType.OctetStream;
    }
  }
}
