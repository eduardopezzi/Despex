import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@core/database/database.module';
import { SecretsModule } from '@core/secrets/secrets.module';
import { StorageModule } from '@core/storage/storage.module';
import { InvoicesModule } from '@biz-modules/invoices/invoices.module';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { AppSecret } from '@core/types/app-secret.enum';
import { OcrProcessor } from '@biz-modules/invoices/ocr.processor';
import { QueueName } from '@core/types/queue-name.enum';

@Module({
  imports: [
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
    InvoicesModule,
    BullModule.registerQueue({ name: QueueName.Ocr }),
  ],
  providers: [OcrProcessor],
})
export class WorkerModule {}
