import { ExpenseSourceType, FiscalDocumentType, PaymentType } from '@open-receipt-ocr/types';

export interface ExtractedExpenseData {
  documentType?: FiscalDocumentType;
  sourceType?: ExpenseSourceType;
  merchantName?: string | null;
  merchantTaxId?: string | null;
  totalAmount?: number | null;
  expenseDate?: string | null;
  paymentType?: PaymentType;
  xmlAccessKey?: string | null;
  fiscalQrCodeUrl?: string | null;
}
