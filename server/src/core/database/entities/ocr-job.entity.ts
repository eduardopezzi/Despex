import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { WithModificationDates } from '@core/database/entities/with-modification-dates';
import { OcrJobStatus } from '@open-receipt-ocr/types';
import { OcrFileEntity } from './ocr-file.entity';

@Entity('ocr_jobs')
export class OcrJobEntity extends WithModificationDates {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    name: 'status',
    type: 'varchar',
    enum: OcrJobStatus,
    default: OcrJobStatus.Pending,
  })
  status!: OcrJobStatus;

  @OneToMany(() => OcrFileEntity, (file) => file.job, { cascade: true })
  files!: OcrFileEntity[];
}
