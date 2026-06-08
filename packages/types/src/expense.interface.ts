import { ExpenseSourceType } from './expense-source-type.enum';
import { FiscalDocumentType } from './fiscal-document-type.enum';
import { FiscalFetchStatus } from './fiscal-fetch-status.enum';
import { PaymentType } from './payment-type.enum';

export interface Expense {
  id: number;
  ocrJobId?: number | null;
  ocrFileId?: number | null;
  ocrExecutionId?: number | null;
  documentType: FiscalDocumentType;
  sourceType: ExpenseSourceType;
  rawOcrJson?: string | null;
  rawXml?: string | null;
  xmlAccessKey?: string | null;
  fiscalQrCodeUrl?: string | null;
  officialLookupStatus: FiscalFetchStatus;
  officialLookupMessage?: string | null;
  officialLookupAt?: string | null;
  merchantName?: string | null;
  merchantTaxId?: string | null;
  totalAmount?: number | null;
  expenseDate?: string | null;
  paymentType: PaymentType;
  ownerUserId?: number | null;
  clientRecordId?: number | null;
  isCompanyExpense: boolean;
  expenseTypeRecordId?: number | null;
  reimbursementDate?: string | null;
  isReimbursed: boolean;
  description?: string | null;
  createdByUserId?: number | null;
  updatedByUserId?: number | null;
  createdAt: string;
  updatedAt: string;
}
