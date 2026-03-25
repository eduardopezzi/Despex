import {DynamicModule, ForwardReference, Module, Type} from '@nestjs/common';
import {BullModule} from '@nestjs/bullmq';
import {ServeStaticModule} from '@nestjs/serve-static';
import {join} from 'path';
import {DatabaseModule} from '@core/database/database.module';
import {InvoicesModule} from '@biz-modules/invoices/invoices.module';
import {AppSecret} from '@core/types/app-secret.enum';

type NestModuleImport =
  | Type
  | DynamicModule
  | Promise<DynamicModule>
  | ForwardReference;

const moduleImports: NestModuleImport[] = [
  DatabaseModule,
  BullModule.forRoot({
    connection: {
      host: process.env[AppSecret.RedisHost] || 'localhost',
      port: parseInt(process.env[AppSecret.RedisPort] || '6379'),
    },
  }),
  InvoicesModule,
];

if (process.env[AppSecret.NodeEnv] === 'production') {
  moduleImports.push(
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      exclude: ['/api/(.*)'],
    }),
  );
}

@Module({
  imports: moduleImports,
})
export class AppModule {
}
