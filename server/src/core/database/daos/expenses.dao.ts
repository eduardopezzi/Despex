import { Injectable } from '@nestjs/common';
import { Brackets } from 'typeorm';
import { ExpenseEntity } from '@core/database/entities/expense.entity';
import { BaseDao } from '@core/database/base.dao';
import { ReposService } from '@core/database/repos.service';
import { NoTxn, TxnDef } from '@core/database/txn-def.interface';
import { SortOrder } from '@open-receipt-ocr/types';

@Injectable()
export class ExpensesDao extends BaseDao<ExpenseEntity> {
  constructor(repos: ReposService) {
    super(repos.expense);
  }

  findByOcrExecutionId(txnDef: TxnDef = NoTxn, ocrExecutionId: number): Promise<ExpenseEntity | null> {
    return this.repositoryWithTxnDef(txnDef).findOne({ where: { ocrExecutionId } });
  }

  findAll(
    txnDef: TxnDef = NoTxn,
    options: {
      skip?: number;
      take?: number;
      expenseDateFrom?: string;
      expenseDateTo?: string;
      isReimbursed?: boolean;
      reimbursementDateFrom?: string;
      reimbursementDateTo?: string;
      clientRecordId?: number;
      expenseTypeRecordId?: number;
      ownerUserId?: number;
      search?: string;
      sortField?: keyof ExpenseEntity;
      sortOrder?: SortOrder;
    } = {},
  ): Promise<[ExpenseEntity[], number]> {
    const {
      skip,
      take,
      expenseDateFrom,
      expenseDateTo,
      isReimbursed,
      reimbursementDateFrom,
      reimbursementDateTo,
      clientRecordId,
      expenseTypeRecordId,
      ownerUserId,
      search,
      sortField = 'createdAt',
      sortOrder = SortOrder.DESC,
    } = options;

    const qb = this.repositoryWithTxnDef(txnDef).createQueryBuilder('expense');

    if (expenseDateFrom) {
      qb.andWhere('expense.expenseDate >= :expenseDateFrom', { expenseDateFrom });
    }
    if (expenseDateTo) {
      qb.andWhere('expense.expenseDate <= :expenseDateTo', { expenseDateTo });
    }
    if (isReimbursed !== undefined) {
      qb.andWhere('expense.isReimbursed = :isReimbursed', { isReimbursed });
    }
    if (reimbursementDateFrom) {
      qb.andWhere('expense.reimbursementDate >= :reimbursementDateFrom', { reimbursementDateFrom });
    }
    if (reimbursementDateTo) {
      qb.andWhere('expense.reimbursementDate <= :reimbursementDateTo', { reimbursementDateTo });
    }
    if (clientRecordId !== undefined) {
      qb.andWhere('expense.clientRecordId = :clientRecordId', { clientRecordId });
    }
    if (expenseTypeRecordId !== undefined) {
      qb.andWhere('expense.expenseTypeRecordId = :expenseTypeRecordId', { expenseTypeRecordId });
    }
    if (ownerUserId !== undefined) {
      qb.andWhere('expense.ownerUserId = :ownerUserId', { ownerUserId });
    }
    if (search) {
      const searchTerm = `%${search}%`;
      qb.andWhere(
        new Brackets((innerQb) => {
          innerQb.where('expense.merchantName LIKE :search', { search: searchTerm }).orWhere('expense.description LIKE :search', {
            search: searchTerm,
          });
        }),
      );
    }

    qb.orderBy(`expense.${sortField}`, sortOrder);
    if (sortField !== 'id') {
      qb.addOrderBy('expense.id', 'DESC');
    }

    if (skip !== undefined) {
      qb.skip(skip);
    }
    if (take !== undefined) {
      qb.take(take);
    }

    return qb.getManyAndCount();
  }
}
