import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OcrJobStatus, SortOrder } from '@open-receipt-ocr/types';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';

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
  @IsIn(['id', 'name', 'createdAt', 'status', 'filesCount'])
  sortField?: keyof OcrJobEntity | 'filesCount';

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
