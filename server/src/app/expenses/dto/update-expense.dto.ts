import { PartialType } from '@nestjs/swagger';
import { CreateExpenseDto } from '@app/expenses/dto/create-expense.dto';

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
