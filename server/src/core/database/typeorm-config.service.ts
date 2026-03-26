import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { ReceiptEntity } from '@core/database/entities/receipt.entity';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { AppSecret } from '@core/types/app-secret.enum';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly secretProvider: SecretProvider) {}

  async createTypeOrmOptions(): Promise<TypeOrmModuleOptions> {
    const databasePath = await this.secretProvider.getSecretOrThrow(
      AppSecret.DatabasePath,
    );
    const nodeEnv = await this.secretProvider.getSecret(AppSecret.NodeEnv);

    return {
      type: 'sqlite',
      database: databasePath,
      entities: [ReceiptEntity],
      synchronize: nodeEnv !== 'production',
      autoLoadEntities: true,
    };
  }
}
