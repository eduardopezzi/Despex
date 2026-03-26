export enum ReceiptStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Receipt {
  id: number;
  filename: string;
  originalName: string;
  status: ReceiptStatus;
  ocrData?: string;
  createdAt: Date;
  updatedAt: Date;
}
