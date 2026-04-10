import { Body, Controller, Delete, Get, Logger, Param, ParseIntPipe, Post, Req, Res, NotFoundException, Query } from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { OcrJobsService } from '@biz-modules/ocr-jobs/ocr-jobs.service';
import { RouteParam } from '@core/types/route-param.enum';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';
import { OcrExecutionEntity } from '@core/database/entities/ocr-execution.entity';
import { OcrJobStatus, OcrProvider, PaginatedResponse } from '@open-receipt-ocr/types';
import { OcrJobQueryParams } from './dto/ocr-job-query.params';
import { ValidationPipe } from '@nestjs/common';

@ApiTags('ocr-jobs')
@Controller('ocr-jobs')
export class OcrJobsController {
  private readonly logger = new Logger(OcrJobsController.name);

  constructor(private readonly ocrJobsService: OcrJobsService) {}

  @Get()
  @ApiOperation({ summary: 'List all OCR jobs sorted by date descending with pagination and filters' })
  async findAll(
    @Query(new ValidationPipe({ transform: true, forbidNonWhitelisted: true }))
    params: OcrJobQueryParams,
  ): Promise<PaginatedResponse<OcrJobEntity>> {
    const { page, pageSize, status, search, sortField, sortOrder } = params;
    const [data, total] = await this.ocrJobsService.findAllJobs(page, pageSize, status, search, sortField, sortOrder);
    return { data, total };
  }

  @Get(`:${RouteParam.Id}`)
  @ApiOperation({ summary: 'Get a single OCR job by ID with files and executions' })
  findOne(@Param(RouteParam.Id, ParseIntPipe) id: number): Promise<OcrJobEntity> {
    return this.ocrJobsService.getJob(id);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload N images/PDFs and trigger OCR processing' })
  @ApiConsumes('multipart/form-data')
  async upload(@Req() req: Request): Promise<Pick<OcrJobEntity, 'id'>> {
    this.logger.log('Received HTTP request to upload OCR job');
    const job = await this.ocrJobsService.upload(req);
    return { id: job.id };
  }

  @Post(`files/:fileId/reprocess`)
  @ApiOperation({ summary: 'Reprocess a file with a specific OCR provider' })
  async reprocess(@Param('fileId', ParseIntPipe) fileId: number, @Body('ocrProvider') ocrProvider: OcrProvider): Promise<OcrExecutionEntity> {
    return this.ocrJobsService.retry(fileId, ocrProvider);
  }

  @Get('uploads/:key')
  @ApiOperation({ summary: 'Get an uploaded file' })
  async getFile(@Param('key') key: string, @Res() res: Response): Promise<void> {
    const exists = await this.ocrJobsService.fileExists(key);
    if (!exists) {
      throw new NotFoundException(`File ${key} not found`);
    }

    const fileEntity = await this.ocrJobsService.getFileByKey(key);
    if (fileEntity && fileEntity.originalName) {
      const { extname } = await import('node:path');
      res.type(extname(fileEntity.originalName));
    }

    const stream = await this.ocrJobsService.getFileStream(key);
    stream.pipe(res);
  }

  @Delete(`:${RouteParam.Id}`)
  @ApiOperation({ summary: 'Delete an OCR job and its files' })
  async delete(@Param(RouteParam.Id, ParseIntPipe) id: number): Promise<void> {
    await this.ocrJobsService.deleteJob(id);
  }
}
