import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from '@core/database/typeorm-config.service';
import { InvoiceEntity } from '@core/database/entities/invoice.entity';
import { ReposService } from '@core/database/repos.service';
import { DbService } from '@core/database/db.service';
import { SecretsModule } from '@core/secrets/secrets.module';

const entitiesModule = TypeOrmModule.forFeature([InvoiceEntity]);

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
  providers: [TypeOrmConfigService, ReposService, DbService],
  exports: [
    TypeOrmConfigService,
    entitiesModule,
    ReposService,
    DbService,
    SecretsModule,
  ],
})
export class DatabaseModule {}
