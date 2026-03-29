import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from '@core/database/typeorm-config.service';
import { ReceiptEntity } from '@core/database/entities/receipt.entity';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';
import { OcrExecutionEntity } from '@core/database/entities/ocr-execution.entity';
import { ReposService } from '@core/database/repos.service';
import { DbService } from '@core/database/db.service';
import { SecretsModule } from '@core/secrets/secrets.module';
import { ReceiptsDao } from '@core/database/daos/receipts.dao';
import { OcrJobsDao } from '@core/database/daos/ocr-jobs.dao';
import { OcrFilesDao } from '@core/database/daos/ocr-files.dao';
import { OcrExecutionsDao } from '@core/database/daos/ocr-executions.dao';

const entitiesModule = TypeOrmModule.forFeature([ReceiptEntity, OcrJobEntity, OcrFileEntity, OcrExecutionEntity]);

const DAOs = [ReceiptsDao, OcrJobsDao, OcrFilesDao, OcrExecutionsDao];

@Global()
@Module({
  imports: [
    SecretsModule,
    TypeOrmModule.forRootAsync({
      imports: [SecretsModule],
      useClass: TypeOrmConfigService,
    }),
    entitiesModule,
  ],
  providers: [TypeOrmConfigService, ReposService, DbService, ...DAOs],
  exports: [TypeOrmConfigService, entitiesModule, ReposService, DbService, SecretsModule, ...DAOs],
})
export class DatabaseModule {}
