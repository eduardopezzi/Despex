import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from '@core/database/typeorm-config.service';
import { ReceiptEntity } from '@core/database/entities/receipt.entity';
import { ReposService } from '@core/database/repos.service';
import { DbService } from '@core/database/db.service';
import { SecretsModule } from '@core/secrets/secrets.module';
import { ReceiptsDao } from '@core/database/daos/receipts.dao';

const entitiesModule = TypeOrmModule.forFeature([ReceiptEntity]);

const DAOs = [ReceiptsDao];

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
  exports: [TypeOrmConfigService, entitiesModule, ReposService, DbService, SecretsModule],
})
export class DatabaseModule {}
