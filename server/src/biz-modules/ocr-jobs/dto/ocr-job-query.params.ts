import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OcrJobStatus, SortOrder } from '@open-receipt-ocr/types';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';

const ALLOWED_SORT_FIELDS: Array<keyof OcrJobEntity | 'filesCount'> = ['id', 'name', 'createdAt', 'status', 'filesCount'];

export class OcrJobQueryParams {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @IsEnum(OcrJobStatus)
  status?: OcrJobStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(ALLOWED_SORT_FIELDS)
  sortField?: (typeof ALLOWED_SORT_FIELDS)[number];

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
