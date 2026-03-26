import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ReceiptsDao } from '@biz-modules/receipts/receipts.dao';
import { ReceiptEntity } from '@core/database/entities/receipt.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Request } from 'express';
import Busboy from 'busboy';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { AppSecret } from '@core/types/app-secret.enum';
import { QueueName } from '@core/types/queue-name.enum';
import {
  ALLOWED_MIME_TYPES,
  DEFAULT_MAX_FILE_SIZE_BYTES,
} from '@core/constants/media.constants';

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    private readonly receiptsDao: ReceiptsDao,
    @InjectQueue(QueueName.Ocr) private readonly ocrQueue: Queue,
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

    const maxSizeStr = await this.secretProvider.getSecret(
      AppSecret.MaxFileSizeBytes,
    );
    const maxSizeBytes = maxSizeStr
      ? parseInt(maxSizeStr, 10)
      : DEFAULT_MAX_FILE_SIZE_BYTES;

    const { key, originalName } = await this.parseAndStream(req, maxSizeBytes);

    const receipt = await this.receiptsDao.createAndEnqueue(key, originalName);
    await this.ocrQueue.add('process-ocr', { receiptId: receipt.id });
    this.logger.log(`Receipt #${receipt.id} queued for OCR`);

    return receipt;
  }

  /**
   * Parses the multipart body with Busboy and pipes the first file stream
   * directly into the StorageProvider without any RAM buffering.
   *
   * Validation — all checked before or during streaming:
   *   - Filename must be present (Busboy `info`)
   *   - MIME type must be in ALLOWED_MIME_TYPES (Busboy `info`)
   *   - File size must not exceed MAX_FILE_SIZE_BYTES (Busboy `limits.fileSize`)
   */
  private parseAndStream(
    req: Request,
    maxSizeBytes: number,
  ): Promise<{ key: string; originalName: string }> {
    return new Promise((resolve, reject) => {
      const busboy = Busboy({
        headers: req.headers,
        limits: {
          files: 1, // Accept exactly one file per request
          fileSize: maxSizeBytes,
        },
      });

      let fileFound = false;
      let settled = false;

      const settle = (action: () => void) => {
        if (!settled) {
          settled = true;
          action();
        }
      };

      busboy.on('file', (fieldname, stream, info) => {
        const { filename, mimeType } = info;
        fileFound = true;

        if (!filename) {
          stream.resume(); // drain without piping
          return settle(() =>
            reject(new BadRequestException('Upload must include a filename.')),
          );
        }

        if (!ALLOWED_MIME_TYPES.has(mimeType)) {
          stream.resume();
          return settle(() =>
            reject(
              new BadRequestException(
                `Unsupported file type "${mimeType}". Allowed: ${[
                  ...ALLOWED_MIME_TYPES,
                ].join(', ')}.`,
              ),
            ),
          );
        }

        this.logger.log(`Streaming upload: ${filename} (${mimeType})`);

        stream.on('limit', () => {
          settle(() =>
            reject(
              new BadRequestException(
                `File exceeds the maximum allowed size of ${maxSizeBytes / 1024 / 1024} MB.`,
              ),
            ),
          );
        });

        this.storage
          .uploadStream(stream, filename, mimeType)
          .then((result) =>
            settle(() => resolve({ key: result.key, originalName: filename })),
          )
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            settle(() =>
              reject(
                new InternalServerErrorException(`Storage error: ${message}`),
              ),
            );
          });
      });

      busboy.on('error', (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        settle(() =>
          reject(
            new InternalServerErrorException(
              `Multipart parse error: ${message}`,
            ),
          ),
        );
      });

      busboy.on('finish', () => {
        if (!fileFound) {
          settle(() =>
            reject(
              new BadRequestException(
                'No file field found in the multipart request.',
              ),
            ),
          );
        }
      });

      req.pipe(busboy);
    });
  }
}
