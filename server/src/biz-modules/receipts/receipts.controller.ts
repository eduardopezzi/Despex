import { Body, Controller, Delete, Get, Logger, Param, ParseIntPipe, Post, Req, Res } from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { existsSync } from 'fs';
import type { Request, Response } from 'express';
import { ReceiptsService } from '@biz-modules/receipts/receipts.service';
import { RouteParam } from '@core/types/route-param.enum';
import { LocalStorageProvider } from '@core/storage/local-storage.provider';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';
import { OcrExecutionEntity } from '@core/database/entities/ocr-execution.entity';
import { OcrProvider } from '@open-receipt-ocr/types';

@ApiTags('receipts')
@Controller('receipts')
export class ReceiptsController {
  private readonly logger = new Logger(ReceiptsController.name);

  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly localStorage: LocalStorageProvider,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all OCR jobs sorted by date descending' })
  findAll(): Promise<OcrJobEntity[]> {
    return this.receiptsService.findAllJobs();
  }

  @Get(`:${RouteParam.Id}`)
  @ApiOperation({ summary: 'Get a single OCR job by ID with files and executions' })
  findOne(@Param(RouteParam.Id, ParseIntPipe) id: number): Promise<OcrJobEntity> {
    return this.receiptsService.getJob(id);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload N images/PDFs and trigger OCR processing' })
  @ApiConsumes('multipart/form-data')
  async upload(@Req() req: Request): Promise<Pick<OcrJobEntity, 'id'>> {
    this.logger.log('Received HTTP request to upload OCR job');
    const job = await this.receiptsService.upload(req);
    return { id: job.id };
  }

  @Post(`files/:fileId/reprocess`)
  @ApiOperation({ summary: 'Reprocess a file with a specific OCR provider' })
  async reprocess(
    @Param('fileId', ParseIntPipe) fileId: number,
    @Body('ocrProvider') ocrProvider: OcrProvider,
  ): Promise<OcrExecutionEntity> {
    return this.receiptsService.retry(fileId, ocrProvider);
  }

  @Delete(`:${RouteParam.Id}`)
  @ApiOperation({ summary: 'Delete an OCR job and its files' })
  async delete(@Param(RouteParam.Id, ParseIntPipe) id: number): Promise<void> {
    await this.receiptsService.deleteJob(id);
  }
}
