import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ReceiptsDao } from '@core/database/daos/receipts.dao';
import { ReceiptEntity } from '@core/database/entities/receipt.entity';
import type { Request } from 'express';
import { QueueService } from '@core/queue/queue.service';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { AppSecret } from '@core/types/app-secret.enum';
import { ALLOWED_MIME_TYPES, DEFAULT_MAX_FILE_SIZE_BYTES } from '@core/constants/media.constants';
import { parseMultipartStream } from '@core/utils/multipart.util';

import { ReceiptStatus } from '@core/types/receipt-status.enum';
import { OcrProvider } from '@core/types/ocr-provider.enum';

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    private readonly receiptsDao: ReceiptsDao,
    private readonly queueService: QueueService,
    private readonly secretProvider: SecretProvider,
    @Inject(StorageProvider) private readonly storage: StorageProvider,
  ) {}

  findAll(): Promise<ReceiptEntity[]> {
    return this.receiptsDao.findAllByDateDesc();
  }

  findOneOrFail(id: number): Promise<ReceiptEntity> {
    return this.receiptsDao.getOneByPkOrFail(id);
  }

  async upload(req: Request): Promise<ReceiptEntity> {
    const contentType = req.headers['content-type'];
    if (!contentType?.startsWith('multipart/form-data')) {
      throw new BadRequestException('Expected a multipart/form-data request.');
    }

    const maxSizeStr = await this.secretProvider.getSecret(AppSecret.MaxFileSizeBytes);
    const maxSizeBytes = maxSizeStr ? parseInt(maxSizeStr, 10) : DEFAULT_MAX_FILE_SIZE_BYTES;

    const parseResult = await parseMultipartStream(req, this.storage, {
      maxSizeBytes,
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });

    let ocrProvider: OcrProvider = OcrProvider.Mistral;
    if (parseResult.fields['ocrProvider'] && Object.values(OcrProvider).includes(parseResult.fields['ocrProvider'] as OcrProvider)) {
      ocrProvider = parseResult.fields['ocrProvider'] as OcrProvider;
    }

    const receipt = await this.receiptsDao.create({
      filename: parseResult.file.key,
      originalName: parseResult.file.originalName,
      ocrProvider,
    });
    await this.queueService.addToOcrQueue({ receiptId: receipt.id });
    this.logger.log(`Receipt #${receipt.id} queued for OCR`);

    return receipt;
  }

  async retry(id: number): Promise<ReceiptEntity> {
    await this.receiptsDao.updateByPk(id, {
      status: ReceiptStatus.Pending,
      ocrData: null,
    });
    await this.queueService.addToOcrQueue({ receiptId: id });
    this.logger.log(`Receipt #${id} re-queued for OCR (retry)`);
    return this.receiptsDao.getOneByPkOrFail(id);
  }

  async delete(id: number): Promise<void> {
    const receipt = await this.receiptsDao.getOneByPkOrFail(id);
    await this.receiptsDao.deleteByPk(id);
    await this.storage.delete(receipt.filename);
    this.logger.log(`Receipt #${id} and file ${receipt.filename} deleted`);
  }
}
