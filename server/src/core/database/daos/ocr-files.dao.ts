import { Injectable } from '@nestjs/common';
import { BaseDao } from '@core/database/base.dao';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';
import { ReposService } from '@core/database/repos.service';

@Injectable()
export class OcrFilesDao extends BaseDao<OcrFileEntity> {
  constructor(repos: ReposService) {
    super(repos.ocrFile);
  }

  findOneWithExecutions(id: number): Promise<OcrFileEntity | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['executions'],
    });
  }
}
