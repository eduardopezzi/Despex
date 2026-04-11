import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { AppSecret } from '@core/types/app-secret.enum';
import { OcrExecutionEntity } from '@core/database/entities/ocr-execution.entity';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly secretProvider: SecretProvider) {}

  async createTypeOrmOptions(): Promise<TypeOrmModuleOptions> {
    const databasePath = await this.secretProvider.getSecretOrThrow(AppSecret.DatabasePath);
    const nodeEnv = await this.secretProvider.getSecret(AppSecret.NodeEnv);

    return {
      type: 'sqlite',
      database: databasePath,
      entities: [OcrExecutionEntity, OcrFileEntity, OcrJobEntity],
      synchronize: nodeEnv !== 'production',
      autoLoadEntities: true,
    };
  }
}
