import { Module } from '@nestjs/common';
import { QueueModule } from '@core/queue/queue.module';
import { OcrJobsController } from '@app/ocr-jobs/ocr-jobs.controller';
import { OcrJobsService } from '@app/ocr-jobs/ocr-jobs.service';
import { ReceiptsDao } from '@core/database/daos/receipts.dao';

@Module({
  imports: [QueueModule],
  controllers: [OcrJobsController],
  providers: [OcrJobsService, ReceiptsDao],
  exports: [OcrJobsService, ReceiptsDao],
})
export class OcrJobsModule {}
