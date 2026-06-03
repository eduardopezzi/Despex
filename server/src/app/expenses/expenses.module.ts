import { Module } from '@nestjs/common';
import { ExpensesController } from '@app/expenses/expenses.controller';
import { ExpensesService } from '@app/expenses/expenses.service';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
