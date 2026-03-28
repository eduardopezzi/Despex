import { Module } from '@nestjs/common';
import { QueueModule } from '@core/queue/queue.module';
import { ReceiptsController } from '@biz-modules/receipts/receipts.controller';
import { ReceiptsService } from '@biz-modules/receipts/receipts.service';
import { ReceiptsDao } from '@core/database/daos/receipts.dao';

@Module({
  imports: [QueueModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, ReceiptsDao],
  exports: [ReceiptsService, ReceiptsDao],
})
export class ReceiptsModule {}
