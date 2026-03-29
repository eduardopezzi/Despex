import { Injectable } from '@nestjs/common';
import { BaseDao } from '@core/database/base.dao';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';
import { ReposService } from '@core/database/repos.service';

@Injectable()
export class OcrJobsDao extends BaseDao<OcrJobEntity> {
  constructor(repos: ReposService) {
    super(repos.ocrJob);
  }

  findAllWithRelations(): Promise<OcrJobEntity[]> {
    return this.repo.find({
      relations: ['files', 'files.executions'],
      order: { createdAt: 'DESC' },
    });
  }

  findOneWithRelations(id: number): Promise<OcrJobEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['files', 'files.executions'],
    });
  }
}
