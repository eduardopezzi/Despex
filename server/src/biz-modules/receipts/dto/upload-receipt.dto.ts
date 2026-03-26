import { ApiProperty } from '@nestjs/swagger';

/**
 * Documents the multipart/form-data shape for the receipt upload endpoint.
 *
 * Note: class-validator cannot run against streaming multipart bodies —
 * file size is enforced by Busboy limits and mimetype by the controller.
 */
export class UploadReceiptDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Receipt file — accepted formats: PDF, JPEG, PNG (max 20 MB)',
  })
  file!: Express.Multer.File;
}
