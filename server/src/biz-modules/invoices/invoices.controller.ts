import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { existsSync } from 'fs';
import type { Request, Response } from 'express';
import Busboy from 'busboy';
import { InvoicesService } from '@biz-modules/invoices/invoices.service';
import { InvoiceEntity } from '@core/database/entities/invoice.entity';
import { RouteParam } from '@core/types/route-param.enum';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { LocalStorageProvider } from '@core/storage/local-storage.provider';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

  constructor(
    private readonly invoicesService: InvoicesService,
    @Inject(StorageProvider) private readonly storage: StorageProvider,
    private readonly localStorage: LocalStorageProvider,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all invoices sorted by date descending' })
  findAll(): Promise<InvoiceEntity[]> {
    return this.invoicesService.findAll();
  }

  @Get(`:${RouteParam.Id}`)
  @ApiOperation({ summary: 'Get a single invoice by ID' })
  findOne(
    @Param(RouteParam.Id, ParseIntPipe) id: number,
  ): Promise<InvoiceEntity> {
    return this.invoicesService.findOneOrFail(id);
  }

  /**
   * Streams the multipart upload directly from the HTTP request to the
   * configured storage provider using Busboy — no RAM buffering of file bytes.
   *
   * Data flow:
   *   HTTP request → Busboy (multipart parser) → StorageProvider.uploadStream() → storage
   */
  @Post('upload')
  @ApiOperation({
    summary: 'Upload an invoice image/PDF and trigger OCR processing',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async upload(
    @Req() req: Request,
  ): Promise<{ id: number; message: string }> {
    const contentType = req.headers['content-type'];
    if (!contentType?.startsWith('multipart/form-data')) {
      throw new BadRequestException('Expected a multipart/form-data request.');
    }

    const { key, originalName } = await this.parseAndStream(req);

    const invoice = await this.invoicesService.upload(key, originalName);
    return { id: invoice.id, message: 'Upload successful — OCR queued.' };
  }

  /**
   * Serve locally-stored invoice files.
   * In production this should be handled by a CDN or reverse-proxy.
   */
  @Get('uploads/:key')
  @ApiOperation({ summary: 'Serve a locally-stored invoice file by key' })
  serveFile(@Param('key') key: string, @Res() res: Response): void {
    const filePath = this.localStorage.getFilePath(key);
    if (!existsSync(filePath)) {
      res.status(404).send('File not found');
      return;
    }
    res.sendFile(filePath);
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Parses the multipart body using Busboy and pipes the first file field
   * directly into `StorageProvider.uploadStream()` without buffering.
   */
  private parseAndStream(req: Request): Promise<{ key: string; originalName: string }> {
    return new Promise((resolve, reject) => {
      const busboy = Busboy({ headers: req.headers });
      let settled = false;

      busboy.on('file', (fieldname, stream, info) => {
        const { filename, mimeType } = info;

        if (!filename) {
          stream.resume(); // drain and discard
          reject(new BadRequestException('Upload must include a filename.'));
          return;
        }

        this.logger.log(`Streaming upload: ${filename} (${mimeType})`);

        this.storage
          .uploadStream(stream, filename, mimeType)
          .then((result) => {
            if (!settled) {
              settled = true;
              resolve({ key: result.key, originalName: filename });
            }
          })
          .catch((err: unknown) => {
            if (!settled) {
              settled = true;
              const message = err instanceof Error ? err.message : String(err);
              reject(new InternalServerErrorException(`Storage error: ${message}`));
            }
          });
      });

      busboy.on('error', (err: unknown) => {
        if (!settled) {
          settled = true;
          const message = err instanceof Error ? err.message : String(err);
          reject(new InternalServerErrorException(`Multipart parse error: ${message}`));
        }
      });

      busboy.on('finish', () => {
        if (!settled) {
          settled = true;
          reject(new BadRequestException('No file field found in the multipart request.'));
        }
      });

      req.pipe(busboy);
    });
  }
}
