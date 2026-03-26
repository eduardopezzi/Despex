import {
  Controller,
  Get,
  Inject,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { existsSync } from 'fs';
import type { Response } from 'express';
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

  @Post('upload')
  @ApiOperation({
    summary: 'Upload an invoice image/PDF and trigger OCR processing',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ id: number; message: string }> {
    this.logger.log(`Received upload: ${file.originalname}`);
    const result = await this.storage.upload(file);
    const invoice = await this.invoicesService.upload(
      result.key,
      file.originalname,
    );
    return { id: invoice.id, message: 'Upload successful — OCR queued.' };
  }

  /**
   * Serve locally-stored invoice files.
   * In production this should be behind a CDN / reverse-proxy instead.
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
}
