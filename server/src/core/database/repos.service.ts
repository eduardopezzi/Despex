import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';
import { OcrExecutionEntity } from '@core/database/entities/ocr-execution.entity';
import { ExpenseEntity } from '@core/database/entities/expense.entity';
import { RecordEntity } from '@core/database/entities/record.entity';

@Injectable()
export class ReposService {
  constructor(
    @InjectRepository(OcrJobEntity)
    public readonly ocrJob: Repository<OcrJobEntity>,
    @InjectRepository(OcrFileEntity)
    public readonly ocrFile: Repository<OcrFileEntity>,
    @InjectRepository(OcrExecutionEntity)
    public readonly ocrExecution: Repository<OcrExecutionEntity>,
    @InjectRepository(ExpenseEntity)
    public readonly expense: Repository<ExpenseEntity>,
    @InjectRepository(RecordEntity)
    public readonly record: Repository<RecordEntity>,
  ) {}
}
