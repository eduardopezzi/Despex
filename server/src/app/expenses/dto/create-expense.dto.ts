import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ExpenseSourceType, FiscalDocumentType, FiscalFetchStatus, PaymentType } from '@open-receipt-ocr/types';

export class CreateExpenseDto {
  @IsOptional()
  @IsInt()
  ocrJobId?: number | null;

  @IsOptional()
  @IsInt()
  ocrFileId?: number | null;

  @IsOptional()
  @IsInt()
  ocrExecutionId?: number | null;

  @IsOptional()
  @IsEnum(FiscalDocumentType)
  documentType?: FiscalDocumentType;

  @IsOptional()
  @IsEnum(ExpenseSourceType)
  sourceType?: ExpenseSourceType;

  @IsOptional()
  @IsString()
  rawOcrJson?: string | null;

  @IsOptional()
  @IsString()
  rawXml?: string | null;

  @IsOptional()
  @IsString()
  xmlAccessKey?: string | null;

  @IsOptional()
  @IsString()
  fiscalQrCodeUrl?: string | null;

  @IsOptional()
  @IsEnum(FiscalFetchStatus)
  officialLookupStatus?: FiscalFetchStatus;

  @IsOptional()
  @IsString()
  officialLookupMessage?: string | null;

  @IsOptional()
  @IsDateString()
  officialLookupAt?: string | null;

  @IsOptional()
  @IsString()
  merchantName?: string | null;

  @IsOptional()
  @IsString()
  merchantTaxId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number | null;

  @IsOptional()
  @IsDateString()
  expenseDate?: string | null;

  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;

  @IsOptional()
  @IsInt()
  ownerUserId?: number | null;

  @IsOptional()
  @IsInt()
  clientRecordId?: number | null;

  @IsOptional()
  @IsBoolean()
  isCompanyExpense?: boolean;

  @IsOptional()
  @IsInt()
  expenseTypeRecordId?: number | null;

  @IsOptional()
  @IsDateString()
  reimbursementDate?: string | null;

  @IsOptional()
  @IsBoolean()
  isReimbursed?: boolean;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsInt()
  createdByUserId?: number | null;

  @IsOptional()
  @IsInt()
  updatedByUserId?: number | null;
}
