export enum InvoiceStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Invoice {
  id: number;
  filename: string;
  originalName: string;
  status: InvoiceStatus;
  ocrData?: string;
  createdAt: Date;
  updatedAt: Date;
}
