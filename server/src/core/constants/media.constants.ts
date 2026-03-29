import { MimeType } from '@open-receipt-ocr/types';

export const ALLOWED_MIME_TYPES = new Set<string>([MimeType.Pdf, MimeType.Jpeg, MimeType.Png]);

export const DEFAULT_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
