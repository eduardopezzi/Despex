import { Controller, Post, Get, UseInterceptors, UploadedFile, Param, ParseIntPipe, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InvoicesService } from './invoices.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Invoice } from './invoice.entity';

@Controller('invoices')
export class InvoicesController {
  private readonly logger = new Logger(InvoicesController.name);

  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    this.logger.log(`Received file: ${file.originalname} as ${file.filename}`);
    const invoice = await this.invoicesService.create(file.filename, file.originalname);
    return { id: invoice.id, message: 'Upload successful, OCR processing started.' };
  }

  @Get()
  async findAll(): Promise<Invoice[]> {
    return this.invoicesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Invoice> {
    const invoice = await this.invoicesService.findOne(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }
    return invoice;
  }
}
