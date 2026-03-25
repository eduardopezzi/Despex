import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {InvoiceEntity} from '@core/database/entities/invoice.entity';

@Injectable()
export class ReposService {
  constructor(
    @InjectRepository(InvoiceEntity)
    public readonly invoice: Repository<InvoiceEntity>,
  ) {
  }
}
