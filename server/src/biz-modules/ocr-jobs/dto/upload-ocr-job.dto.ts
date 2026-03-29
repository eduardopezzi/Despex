import { ApiProperty } from '@nestjs/swagger';
import { OcrProvider } from '@core/types/ocr-provider.enum';

/**
 * Documents the multipart/form-data shape for the OCR job upload endpoint.
 */
export class UploadOcrJobDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'OCR job file — accepted formats: PDF, JPEG, PNG (max 20 MB)',
  })
  file!: Express.Multer.File;

  @ApiProperty({
    enum: OcrProvider,
    default: OcrProvider.Mistral,
    description: 'The OCR provider to use for processing',
  })
  ocrProvider?: OcrProvider;
}
