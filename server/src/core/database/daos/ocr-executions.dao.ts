import { Injectable } from '@nestjs/common';
import { BaseDao } from '@core/database/base.dao';
import { OcrExecutionEntity } from '@core/database/entities/ocr-execution.entity';
import { ReposService } from '@core/database/repos.service';

@Injectable()
export class OcrExecutionsDao extends BaseDao<OcrExecutionEntity> {
  constructor(repos: ReposService) {
    super(repos.ocrExecution);
  }
}
