import { PartialType } from '@nestjs/swagger';
import { CreateRecordDto } from '@app/records/dto/create-record.dto';

export class UpdateRecordDto extends PartialType(CreateRecordDto) {}
