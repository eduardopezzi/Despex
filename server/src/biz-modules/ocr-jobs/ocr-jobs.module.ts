import { Module } from '@nestjs/common';
import { QueueModule } from '@core/queue/queue.module';
import { OcrJobsController } from '@biz-modules/ocr-jobs/ocr-jobs.controller';
import { OcrJobsService } from '@biz-modules/ocr-jobs/ocr-jobs.service';
import { ReceiptsDao } from '@core/database/daos/receipts.dao';
import { MistralProcessor } from './mistral.processor';

@Module({
  imports: [QueueModule],
  controllers: [OcrJobsController],
  providers: [OcrJobsService, ReceiptsDao, MistralProcessor],
  exports: [OcrJobsService, ReceiptsDao, MistralProcessor],
})
export class OcrJobsModule {}
