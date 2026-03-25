import {Module} from '@nestjs/common';
import {BullModule} from '@nestjs/bullmq';
import {InvoicesController} from '@biz-modules/invoices/invoices.controller';
import {InvoicesService} from '@biz-modules/invoices/invoices.service';
import {InvoicesDao} from '@biz-modules/invoices/invoices.dao';
import {OcrProcessor} from '@biz-modules/invoices/ocr.processor';

@Module({
  imports: [BullModule.registerQueue({name: 'ocr-queue'})],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesDao, OcrProcessor],
})
export class InvoicesModule {
}
