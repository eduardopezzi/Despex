import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MulterModule } from '@nestjs/platform-express';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { Invoice } from './invoice.entity';
import { OCRProcessor } from './ocr-processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice]),
    BullModule.registerQueue({
      name: 'ocr-queue',
    }),
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, OCRProcessor],
  exports: [InvoicesService],
})
export class InvoicesModule {}
