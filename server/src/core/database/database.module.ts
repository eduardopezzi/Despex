import {Global, Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {TypeOrmConfigService} from '@core/database/typeorm-config.service';
import {InvoiceEntity} from '@core/database/entities/invoice.entity';
import {ReposService} from '@core/database/repos.service';
import {DbService} from '@core/database/db.service';

const entitiesModule = TypeOrmModule.forFeature([InvoiceEntity]);

@Global()
@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            useClass: TypeOrmConfigService,
        }),
        entitiesModule,
    ],
    providers: [TypeOrmConfigService, ReposService, DbService],
    exports: [TypeOrmConfigService, entitiesModule, ReposService, DbService],
})
export class DatabaseModule {
}
