import { Module } from '@nestjs/common';
import { RecordsController } from '@app/records/records.controller';
import { RecordsService } from '@app/records/records.service';

@Module({
  controllers: [RecordsController],
  providers: [RecordsService],
  exports: [RecordsService],
})
export class RecordsModule {}
