import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginatedResponse } from '@open-receipt-ocr/types';
import { ExpenseExtractionFeedbackEntity } from '@core/database/entities/expense-extraction-feedback.entity';
import { ExpenseEntity } from '@core/database/entities/expense.entity';
import { RouteParam } from '@core/types/route-param.enum';
import { CreateExpenseDto } from '@app/expenses/dto/create-expense.dto';
import { ExpenseQueryParams } from '@app/expenses/dto/expense-query.params';
import { ExpensesService } from '@app/expenses/expenses.service';
import { UpdateExpenseDto } from '@app/expenses/dto/update-expense.dto';

@ApiTags('expenses')
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @ApiOperation({ summary: 'List expenses with pagination and filters' })
  async findAll(
    @Query(new ValidationPipe({ transform: true, forbidNonWhitelisted: true }))
    params: ExpenseQueryParams,
  ): Promise<PaginatedResponse<ExpenseEntity>> {
    const [data, total] = await this.expensesService.findAll(params);
    return { data, total };
  }

  @Post()
  @ApiOperation({ summary: 'Create an expense manually or from an imported fiscal source' })
  create(@Body() dto: CreateExpenseDto): Promise<ExpenseEntity> {
    return this.expensesService.create(dto);
  }

  @Get('extraction-feedback')
  @ApiOperation({ summary: 'List user corrections captured as extraction feedback' })
  async findExtractionFeedback(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '50',
  ): Promise<PaginatedResponse<ExpenseExtractionFeedbackEntity>> {
    const safePage = Math.max(Number(page) || 1, 1);
    const safePageSize = Math.min(Math.max(Number(pageSize) || 50, 1), 200);
    const [data, total] = await this.expensesService.findExtractionFeedback(safePage, safePageSize);
    return { data, total };
  }

  @Get(`:${RouteParam.Id}`)
  @ApiOperation({ summary: 'Get a single expense by ID' })
  findOne(@Param(RouteParam.Id, ParseIntPipe) id: number): Promise<ExpenseEntity> {
    return this.expensesService.getExpense(id);
  }

  @Patch(`:${RouteParam.Id}/reextract`)
  @ApiOperation({ summary: 'Re-extract normalized fields from stored OCR JSON or fiscal XML' })
  reextract(@Param(RouteParam.Id, ParseIntPipe) id: number): Promise<ExpenseEntity> {
    return this.expensesService.reextract(id);
  }

  @Patch(`:${RouteParam.Id}`)
  @ApiOperation({ summary: 'Update editable expense fields' })
  update(@Param(RouteParam.Id, ParseIntPipe) id: number, @Body() dto: UpdateExpenseDto): Promise<ExpenseEntity> {
    return this.expensesService.update(id, dto);
  }

  @Delete(`:${RouteParam.Id}`)
  @ApiOperation({ summary: 'Delete an expense' })
  delete(@Param(RouteParam.Id, ParseIntPipe) id: number): Promise<void> {
    return this.expensesService.delete(id);
  }
}
