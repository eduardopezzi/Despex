import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReceiptsController } from '@biz-modules/receipts/receipts.controller';
import { ReceiptsService } from '@biz-modules/receipts/receipts.service';
import { ReceiptsDao } from '@core/database/daos/receipts.dao';

import { QueueName } from '@core/types/queue-name.enum';

@Module({
  imports: [BullModule.registerQueue({ name: QueueName.Ocr })],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, ReceiptsDao],
  exports: [ReceiptsService, ReceiptsDao],
})
export class ReceiptsModule {}
