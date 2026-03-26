import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@core/database/database.module';
import { SecretsModule } from '@core/secrets/secrets.module';
import { StorageModule } from '@core/storage/storage.module';
import { ReceiptsModule } from '@biz-modules/receipts/receipts.module';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { AppSecret } from '@core/types/app-secret.enum';
import { OcrProcessor } from '@biz-modules/receipts/ocr.processor';
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
    ReceiptsModule,
    BullModule.registerQueue({ name: QueueName.Ocr }),
  ],
  providers: [OcrProcessor],
})
export class WorkerModule {}
