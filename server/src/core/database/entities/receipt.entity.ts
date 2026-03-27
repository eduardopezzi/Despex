import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { WithModificationDates } from '@core/database/entities/with-modification-dates';
import { ReceiptStatus } from '@core/types/receipt-status.enum';
import { OcrProvider } from '@core/types/ocr-provider.enum';

@Entity('receipts')
export class ReceiptEntity extends WithModificationDates {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'filename', type: 'varchar' })
  filename!: string;

  @Column({ name: 'original_name', type: 'varchar' })
  originalName!: string;

  @Column({
    name: 'status',
    type: 'varchar',
    enum: ReceiptStatus,
    default: ReceiptStatus.Pending,
  })
  status!: ReceiptStatus;

  @Column({
    name: 'ocr_provider',
    type: 'varchar',
    enum: OcrProvider,
    default: OcrProvider.Mistral,
  })
  ocrProvider!: OcrProvider;

  @Column({ name: 'ocr_data', type: 'text', nullable: true })
  ocrData?: string | null;
}
