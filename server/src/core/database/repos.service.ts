import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReceiptEntity } from '@core/database/entities/receipt.entity';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';
import { OcrExecutionEntity } from '@core/database/entities/ocr-execution.entity';

@Injectable()
export class ReposService {
  constructor(
    @InjectRepository(ReceiptEntity)
    public readonly receipt: Repository<ReceiptEntity>,
    @InjectRepository(OcrJobEntity)
    public readonly ocrJob: Repository<OcrJobEntity>,
    @InjectRepository(OcrFileEntity)
    public readonly ocrFile: Repository<OcrFileEntity>,
    @InjectRepository(OcrExecutionEntity)
    public readonly ocrExecution: Repository<OcrExecutionEntity>,
  ) {}
}
