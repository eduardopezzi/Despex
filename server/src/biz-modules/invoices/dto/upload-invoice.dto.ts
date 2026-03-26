import { ApiProperty } from '@nestjs/swagger';

/**
 * Documents the multipart/form-data shape for the invoice upload endpoint.
 *
 * Note: class-validator cannot run against streaming multipart bodies —
 * file size is enforced by Busboy limits and mimetype by the controller.
 */
export class UploadInvoiceDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Invoice file — accepted formats: PDF, JPEG, PNG (max 20 MB)',
  })
  file!: Express.Multer.File;
}
