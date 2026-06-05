import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { AppSecret } from '@core/types/app-secret.enum';
import { OcrExecutionEntity } from '@core/database/entities/ocr-execution.entity';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';
import { ExpenseEntity } from '@core/database/entities/expense.entity';
import { RecordEntity } from '@core/database/entities/record.entity';
import * as sqlite3 from 'sqlite3';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly secretProvider: SecretProvider) {}

  async createTypeOrmOptions(): Promise<TypeOrmModuleOptions> {
    const databasePath = await this.secretProvider.getSecretOrThrow(AppSecret.DatabasePath);

    return {
      type: 'sqlite',
      driver: sqlite3, // Explicitly provide the driver to work correctly with Webpack bundling
      database: databasePath,
      entities: [OcrExecutionEntity, OcrFileEntity, OcrJobEntity, ExpenseEntity, RecordEntity],
      synchronize: true, // Auto-create tables (using synchronize for simplicity in v0.x)
      autoLoadEntities: true,
      extra: {
        busy_timeout: 30000,
      },
    };
  }
}
