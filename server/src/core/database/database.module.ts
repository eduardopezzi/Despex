import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from '@core/database/typeorm-config.service';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';
import { OcrExecutionEntity } from '@core/database/entities/ocr-execution.entity';
import { ExpenseEntity } from '@core/database/entities/expense.entity';
import { ExpenseExtractionFeedbackEntity } from '@core/database/entities/expense-extraction-feedback.entity';
import { MerchantAliasEntity } from '@core/database/entities/merchant-alias.entity';
import { RecordEntity } from '@core/database/entities/record.entity';
import { ReposService } from '@core/database/repos.service';
import { DbService } from '@core/database/db.service';
import { SecretsModule } from '@core/secrets/secrets.module';
import { OcrJobsDao } from '@core/database/daos/ocr-jobs.dao';
import { OcrFilesDao } from '@core/database/daos/ocr-files.dao';
import { OcrExecutionsDao } from '@core/database/daos/ocr-executions.dao';
import { ExpensesDao } from '@core/database/daos/expenses.dao';
import { ExpenseExtractionFeedbackDao } from '@core/database/daos/expense-extraction-feedback.dao';
import { MerchantAliasesDao } from '@core/database/daos/merchant-aliases.dao';
import { RecordsDao } from '@core/database/daos/records.dao';

const entitiesModule = TypeOrmModule.forFeature([
  OcrJobEntity,
  OcrFileEntity,
  OcrExecutionEntity,
  ExpenseEntity,
  ExpenseExtractionFeedbackEntity,
  MerchantAliasEntity,
  RecordEntity,
]);

const DAOs = [OcrJobsDao, OcrFilesDao, OcrExecutionsDao, ExpensesDao, ExpenseExtractionFeedbackDao, MerchantAliasesDao, RecordsDao];

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
