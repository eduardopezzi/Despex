import { Controller, Get, Logger, Param, ParseIntPipe, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { existsSync } from 'fs';
import type { Request, Response } from 'express';
import { ReceiptsService } from '@biz-modules/receipts/receipts.service';
import { UploadReceiptDto } from '@biz-modules/receipts/dto/upload-receipt.dto';
import { ReceiptEntity } from '@core/database/entities/receipt.entity';
import { RouteParam } from '@core/types/route-param.enum';
import { LocalStorageProvider } from '@core/storage/local-storage.provider';

@ApiTags('receipts')
@Controller('receipts')
export class ReceiptsController {
  private readonly logger = new Logger(ReceiptsController.name);

  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly localStorage: LocalStorageProvider,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all receipts sorted by date descending' })
  findAll(): Promise<ReceiptEntity[]> {
    return this.receiptsService.findAll();
  }

  @Get(`:${RouteParam.Id}`)
  @ApiOperation({ summary: 'Get a single receipt by ID' })
  findOne(@Param(RouteParam.Id, ParseIntPipe) id: number): Promise<ReceiptEntity> {
    return this.receiptsService.findOneOrFail(id);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a receipt image/PDF and trigger OCR processing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadReceiptDto })
  async upload(@Req() req: Request): Promise<Pick<ReceiptEntity, 'id'>> {
    this.logger.log('Received HTTP request to upload receipt');
    const receipt = await this.receiptsService.upload(req);
    return { id: receipt.id };
  }

  @Get('uploads/:key')
  @ApiOperation({ summary: 'Serve a a file by key' })
  serveFile(@Param('key') key: string, @Res() res: Response): void {
    const filePath = this.localStorage.getFilePath(key);
    if (!existsSync(filePath)) {
      res.status(404).send('File not found');
      return;
    }
    res.sendFile(filePath);
  }
}
