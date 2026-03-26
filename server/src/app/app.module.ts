import { DynamicModule, ForwardReference, Module, Type } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DatabaseModule } from '@core/database/database.module';
import { SecretsModule } from '@core/secrets/secrets.module';
import { StorageModule } from '@core/storage/storage.module';
import { ReceiptsModule } from '@biz-modules/receipts/receipts.module';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { AppSecret } from '@core/types/app-secret.enum';

type NestModuleImport =
  | Type
  | DynamicModule
  | Promise<DynamicModule>
  | ForwardReference;

const moduleImports: NestModuleImport[] = [
  SecretsModule,
  DatabaseModule,
  StorageModule,
  BullModule.forRootAsync({
    imports: [SecretsModule],
    inject: [SecretProvider],
    useFactory: async (secretProvider: SecretProvider) => ({
      connection: {
        host: await secretProvider.getSecretOrThrow(AppSecret.RedisHost),
        port: await secretProvider.getSecretAsIntOrThrow(AppSecret.RedisPort),
      },
    }),
  }),
  ReceiptsModule,
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
export class AppModule {}
