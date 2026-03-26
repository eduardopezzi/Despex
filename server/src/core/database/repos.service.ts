import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReceiptEntity } from '@core/database/entities/receipt.entity';

@Injectable()
export class ReposService {
  constructor(
    @InjectRepository(ReceiptEntity)
    public readonly receipt: Repository<ReceiptEntity>,
  ) {}
}
