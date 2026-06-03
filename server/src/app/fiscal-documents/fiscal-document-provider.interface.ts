import { ExpenseSourceType, FiscalDocumentType, FiscalFetchStatus } from '@open-receipt-ocr/types';

export interface FiscalLookupRequest {
  accessKey: string;
}

export interface FiscalLookupResult {
  status: FiscalFetchStatus;
  message?: string;
  accessKey: string;
  documentType: FiscalDocumentType;
  sourceType?: ExpenseSourceType;
  rawXml?: string;
}

export abstract class FiscalDocumentProvider {
  abstract lookupByAccessKey(request: FiscalLookupRequest): Promise<FiscalLookupResult>;
  abstract downloadXmlByAccessKey(request: FiscalLookupRequest): Promise<FiscalLookupResult>;
}
