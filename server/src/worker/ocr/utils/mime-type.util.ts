import { FileExtension, MimeType } from '@open-receipt-ocr/types';

export function getMimeType(ext: FileExtension): string {
  switch (ext) {
    case FileExtension.Pdf:
      return MimeType.Pdf;
    case FileExtension.Jpg:
    case FileExtension.Jpeg:
      return MimeType.Jpeg;
    case FileExtension.Png:
      return MimeType.Png;
    default:
      return MimeType.OctetStream;
  }
}
