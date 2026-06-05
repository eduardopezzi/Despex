import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { RecordType, SortOrder } from '@open-receipt-ocr/types';
import { RecordEntity } from '@core/database/entities/record.entity';

const ALLOWED_SORT_FIELDS: Array<keyof RecordEntity> = ['id', 'name', 'type', 'isActive', 'createdAt', 'updatedAt'];

export class RecordQueryParams {
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
  @IsEnum(RecordType)
  type?: RecordType;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as unknown;
  })
  @IsBoolean()
  isActive?: boolean;

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
