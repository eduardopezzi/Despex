export enum ReceiptStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum OcrProvider {
  MISTRAL = 'mistral',
  AZURE = 'azure',
  AWS = 'aws',
}

export interface Receipt {
  id: number;
  filename: string;
  originalName: string;
  status: ReceiptStatus;
  ocrProvider: OcrProvider;
  ocrData?: string;
  createdAt: string;
  updatedAt: string;
}
