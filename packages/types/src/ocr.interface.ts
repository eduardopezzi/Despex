import { OcrProvider } from './ocr-provider.enum';
import { OcrExecutionStatus, OcrFileStatus, OcrJobStatus } from './ocr-status.enum';

export interface OcrExecution {
  id: number;
  fileId: number;
  ocrProvider: OcrProvider;
  ocrData?: string | null;
  status: OcrExecutionStatus;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OcrFile {
  id: number;
  jobId: number;
  filename: string;
  originalName: string;
  status: OcrFileStatus;
  executions?: OcrExecution[];
  createdAt: string;
  updatedAt: string;
}

export interface OcrJob {
  id: number;
  status: OcrJobStatus;
  name?: string | null;
  files?: OcrFile[];
  createdAt: string;
  updatedAt: string;
}
