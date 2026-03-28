import { OcrProvider } from './ocr-provider.enum';
import { ReceiptStatus } from './receipt-status.enum';

export interface Receipt {
  id: number;
  filename: string;
  originalName: string;
  status: ReceiptStatus;
  ocrProvider: OcrProvider;
  ocrData?: string | null;
  createdAt: string;
  updatedAt: string;
}
