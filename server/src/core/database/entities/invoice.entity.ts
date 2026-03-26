import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { WithModificationDates } from '@core/database/entities/with-modification-dates';
import { InvoiceStatus } from '@core/types/invoice-status.enum';

@Entity('invoices')
export class InvoiceEntity extends WithModificationDates {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'filename', type: 'varchar' })
  filename!: string;

  @Column({ name: 'original_name', type: 'varchar' })
  originalName!: string;

  @Column({
    name: 'status',
    type: 'varchar',
    enum: InvoiceStatus,
    default: InvoiceStatus.Pending,
  })
  status!: InvoiceStatus;

  @Column({ name: 'ocr_data', type: 'text', nullable: true })
  ocrData?: string | null;
}
