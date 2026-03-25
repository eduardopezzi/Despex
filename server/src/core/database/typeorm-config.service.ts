import {Injectable} from '@nestjs/common';
import {TypeOrmModuleOptions, TypeOrmOptionsFactory} from '@nestjs/typeorm';
import {InvoiceEntity} from '@core/database/entities/invoice.entity';
import {AppSecret} from '@core/types/app-secret.enum';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'sqlite',
      database: process.env[AppSecret.DatabasePath] || 'data/invoice.sqlite',
      entities: [InvoiceEntity],
      synchronize: process.env[AppSecret.NodeEnv] !== 'production',
      autoLoadEntities: true,
    };
  }
}
