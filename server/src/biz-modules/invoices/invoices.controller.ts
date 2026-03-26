import {
  Controller,
  Get,
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
import { InvoicesService } from '@biz-modules/invoices/invoices.service';
import { UploadInvoiceDto } from '@biz-modules/invoices/dto/upload-invoice.dto';
import { InvoiceEntity } from '@core/database/entities/invoice.entity';
import { RouteParam } from '@core/types/route-param.enum';
import { LocalStorageProvider } from '@core/storage/local-storage.provider';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

  constructor(
    private readonly invoicesService: InvoicesService,
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
  @ApiBody({ type: UploadInvoiceDto })
  async upload(@Req() req: Request): Promise<{ id: number; message: string }> {
    this.logger.log('Received HTTP request to upload invoice');
    const invoice = await this.invoicesService.upload(req);
    return { id: invoice.id, message: 'Upload successful — OCR queued.' };
  }

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
