import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InvoicesController } from '@biz-modules/invoices/invoices.controller';
import { InvoicesService } from '@biz-modules/invoices/invoices.service';
import { InvoicesDao } from '@biz-modules/invoices/invoices.dao';
import { QueueName } from '@core/types/queue-name.enum';

@Module({
  imports: [BullModule.registerQueue({ name: QueueName.Ocr })],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesDao],
  exports: [InvoicesService, InvoicesDao],
})
export class InvoicesModule {}
