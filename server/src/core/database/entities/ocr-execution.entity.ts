import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { WithModificationDates } from '@core/database/entities/with-modification-dates';
import { OcrExecutionStatus, OcrProvider } from '@open-receipt-ocr/types';
import { OcrFileEntity } from './ocr-file.entity';

@Entity('ocr_executions')
export class OcrExecutionEntity extends WithModificationDates {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'file_id', type: 'integer' })
  fileId!: number;
  @ManyToOne(() => OcrFileEntity, (file) => file.executions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file!: OcrFileEntity;

  @Column({
    name: 'status',
    type: 'varchar',
    enum: OcrExecutionStatus,
    default: OcrExecutionStatus.Pending,
  })
  status!: OcrExecutionStatus;

  @Column({
    name: 'ocr_provider',
    type: 'varchar',
    enum: OcrProvider,
  })
  ocrProvider!: OcrProvider;

  @Column({ name: 'ocr_data', type: 'text', nullable: true })
  ocrData?: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;
}
