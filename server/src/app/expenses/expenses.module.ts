import { Module } from '@nestjs/common';
import { ExpensesController } from '@app/expenses/expenses.controller';
import { ExpensesService } from '@app/expenses/expenses.service';
import { FiscalDocumentsModule } from '@app/fiscal-documents/fiscal-documents.module';

@Module({
  imports: [FiscalDocumentsModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
