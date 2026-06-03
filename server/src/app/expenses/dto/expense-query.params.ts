import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { SortOrder } from '@open-receipt-ocr/types';
import { ExpenseEntity } from '@core/database/entities/expense.entity';

const ALLOWED_SORT_FIELDS: Array<keyof ExpenseEntity> = [
  'id',
  'createdAt',
  'updatedAt',
  'merchantName',
  'totalAmount',
  'expenseDate',
  'reimbursementDate',
  'isReimbursed',
];

export class ExpenseQueryParams {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @IsDateString()
  expenseDateFrom?: string;

  @IsOptional()
  @IsDateString()
  expenseDateTo?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as unknown;
  })
  @IsBoolean()
  isReimbursed?: boolean;

  @IsOptional()
  @IsDateString()
  reimbursementDateFrom?: string;

  @IsOptional()
  @IsDateString()
  reimbursementDateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  clientRecordId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  expenseTypeRecordId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerUserId?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(ALLOWED_SORT_FIELDS)
  sortField?: (typeof ALLOWED_SORT_FIELDS)[number];

  @IsOptional()
  @IsIn(Object.values(SortOrder))
  sortOrder?: SortOrder;
}
