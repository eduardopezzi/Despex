import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '@core/database/database.module';
import { SecretsModule } from '@core/secrets/secrets.module';
import { StorageModule } from '@core/storage/storage.module';
import { OcrJobsModule } from '@app/ocr-jobs/ocr-jobs.module';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { AppSecret } from '@core/types/app-secret.enum';
import { QueueName } from '@core/types/queue-name.enum';
import { OcrProcessor } from '@worker/ocr/ocr.processor';
import { MistralProcessor } from '@worker/ocr/mistral.processor';
import { TabScannerProcessor } from '@worker/ocr/tabscanner.processor';

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
    OcrJobsModule,
    BullModule.registerQueue({ name: QueueName.Ocr }),
  ],
  providers: [OcrProcessor, MistralProcessor, TabScannerProcessor],
})
export class WorkerModule {}
