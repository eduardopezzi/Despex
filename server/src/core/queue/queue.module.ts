import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from '@core/queue/queue.service';
import { QueueName } from '@core/types/queue-name.enum';

@Module({
  imports: [BullModule.registerQueue({ name: QueueName.Ocr })],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
