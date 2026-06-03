import { Injectable } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { ExpensesDao } from '@core/database/daos/expenses.dao';
import { ExpenseEntity } from '@core/database/entities/expense.entity';
import { NoTxn } from '@core/database/txn-def.interface';
import { CreateExpenseDto } from '@app/expenses/dto/create-expense.dto';
import { ExpenseQueryParams } from '@app/expenses/dto/expense-query.params';
import { UpdateExpenseDto } from '@app/expenses/dto/update-expense.dto';
import { ExpenseSourceType, FiscalDocumentType, FiscalFetchStatus, PaymentType, SortOrder } from '@open-receipt-ocr/types';

@Injectable()
export class ExpensesService {
  constructor(private readonly expensesDao: ExpensesDao) {}

  findAll(params: ExpenseQueryParams): Promise<[ExpenseEntity[], number]> {
    const { page, pageSize } = params;
    const skip = page && pageSize ? (page - 1) * pageSize : undefined;

    return this.expensesDao.findAll(NoTxn, {
      ...params,
      skip,
      take: pageSize,
      sortField: params.sortField || 'createdAt',
      sortOrder: params.sortOrder || SortOrder.DESC,
    });
  }

  create(dto: CreateExpenseDto): Promise<ExpenseEntity> {
    return this.expensesDao.create(NoTxn, {
      ...this.toEntityData(dto),
      documentType: dto.documentType ?? FiscalDocumentType.Unknown,
      sourceType: dto.sourceType ?? ExpenseSourceType.Manual,
      officialLookupStatus: dto.officialLookupStatus ?? FiscalFetchStatus.NotAttempted,
      paymentType: dto.paymentType ?? PaymentType.Unknown,
      isCompanyExpense: dto.isCompanyExpense ?? false,
      isReimbursed: dto.isReimbursed ?? false,
    });
  }

  getExpense(id: number): Promise<ExpenseEntity> {
    return this.expensesDao.getOneByPkOrFail(NoTxn, id);
  }

  update(id: number, dto: UpdateExpenseDto): Promise<ExpenseEntity> {
    return this.expensesDao.updateByPk(NoTxn, id, this.toEntityData(dto));
  }

  delete(id: number): Promise<void> {
    return this.expensesDao.deleteByPk(NoTxn, id);
  }

  private toEntityData(dto: CreateExpenseDto | UpdateExpenseDto): DeepPartial<ExpenseEntity> {
    return {
      ...dto,
      officialLookupAt: dto.officialLookupAt ? new Date(dto.officialLookupAt) : dto.officialLookupAt,
    };
  }
}
