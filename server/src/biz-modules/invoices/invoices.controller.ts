import {
  Controller,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {ApiConsumes, ApiOperation, ApiTags} from '@nestjs/swagger';
import {diskStorage} from 'multer';
import {extname} from 'path';
import {InvoicesService} from '@biz-modules/invoices/invoices.service';
import {InvoiceEntity} from '@core/database/entities/invoice.entity';
import {RouteParam} from '@core/types/route-param.enum';

@ApiTags('invoices')
@Controller('invoices')
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

  constructor(private readonly invoicesService: InvoicesService) {
  }

  @Get()
  @ApiOperation({summary: 'List all invoices sorted by date descending'})
  findAll(): Promise<InvoiceEntity[]> {
    return this.invoicesService.findAll();
  }

  @Get(`:${RouteParam.Id}`)
  @ApiOperation({summary: 'Get a single invoice by ID'})
  findOne(
    @Param(RouteParam.Id, ParseIntPipe) id: number,
  ): Promise<InvoiceEntity> {
    return this.invoicesService.findOneOrFail(id);
  }

  @Post('upload')
  @ApiOperation({summary: 'Upload an invoice and trigger OCR processing'})
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ id: number; message: string }> {
    this.logger.log(`Received upload: ${file.originalname}`);
    const invoice = await this.invoicesService.upload(
      file.filename,
      file.originalname,
    );
    return {id: invoice.id, message: 'Upload successful — OCR queued.'};
  }
}
