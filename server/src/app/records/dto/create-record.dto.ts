import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { RecordType } from '@open-receipt-ocr/types';

export class CreateRecordDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(RecordType)
  type!: RecordType;

  @IsOptional()
  @IsInt()
  createdByUserId?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
