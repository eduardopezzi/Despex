import { Module } from '@nestjs/common';
import { ExpenseExtractionService } from '@app/expense-extraction/expense-extraction.service';

@Module({
  providers: [ExpenseExtractionService],
  exports: [ExpenseExtractionService],
})
export class ExpenseExtractionModule {}
