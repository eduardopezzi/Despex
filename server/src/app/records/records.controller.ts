import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginatedResponse } from '@open-receipt-ocr/types';
import { RecordEntity } from '@core/database/entities/record.entity';
import { RouteParam } from '@core/types/route-param.enum';
import { CreateRecordDto } from '@app/records/dto/create-record.dto';
import { RecordQueryParams } from '@app/records/dto/record-query.params';
import { RecordsService } from '@app/records/records.service';
import { UpdateRecordDto } from '@app/records/dto/update-record.dto';

@ApiTags('records')
@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Get()
  @ApiOperation({ summary: 'List client and expense type records with pagination and filters' })
  async findAll(
    @Query(new ValidationPipe({ transform: true, forbidNonWhitelisted: true }))
    params: RecordQueryParams,
  ): Promise<PaginatedResponse<RecordEntity>> {
    const [data, total] = await this.recordsService.findAll(params);
    return { data, total };
  }

  @Post()
  @ApiOperation({ summary: 'Create a client or expense type record' })
  create(@Body() dto: CreateRecordDto): Promise<RecordEntity> {
    return this.recordsService.create(dto);
  }

  @Get(`:${RouteParam.Id}`)
  @ApiOperation({ summary: 'Get a single record by ID' })
  findOne(@Param(RouteParam.Id, ParseIntPipe) id: number): Promise<RecordEntity> {
    return this.recordsService.getRecord(id);
  }

  @Patch(`:${RouteParam.Id}`)
  @ApiOperation({ summary: 'Update a record' })
  update(@Param(RouteParam.Id, ParseIntPipe) id: number, @Body() dto: UpdateRecordDto): Promise<RecordEntity> {
    return this.recordsService.update(id, dto);
  }

  @Delete(`:${RouteParam.Id}`)
  @ApiOperation({ summary: 'Deactivate a record' })
  deactivate(@Param(RouteParam.Id, ParseIntPipe) id: number): Promise<RecordEntity> {
    return this.recordsService.deactivate(id);
  }
}
