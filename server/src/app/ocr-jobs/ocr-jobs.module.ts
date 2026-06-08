import { Module } from '@nestjs/common';
import { QueueModule } from '@core/queue/queue.module';
import { OcrJobsController } from '@app/ocr-jobs/ocr-jobs.controller';
import { OcrJobsService } from '@app/ocr-jobs/ocr-jobs.service';
import { ConfigModule } from '@app/config/config.module';

@Module({
  imports: [QueueModule, ConfigModule],
  controllers: [OcrJobsController],
  providers: [OcrJobsService],
  exports: [OcrJobsService],
})
export class OcrJobsModule {}
