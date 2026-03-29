import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { WithModificationDates } from '@core/database/entities/with-modification-dates';
import { OcrFileStatus } from '@open-receipt-ocr/types';
import { OcrJobEntity } from './ocr-job.entity';
import { OcrExecutionEntity } from './ocr-execution.entity';

@Entity('ocr_files')
export class OcrFileEntity extends WithModificationDates {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'job_id', type: 'integer' })
  jobId!: number;
  @ManyToOne(() => OcrJobEntity, (job) => job.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: OcrJobEntity;

  @Column({ name: 'filename', type: 'varchar' })
  filename!: string;

  @Column({ name: 'original_name', type: 'varchar' })
  originalName!: string;

  @Column({
    name: 'status',
    type: 'varchar',
    enum: OcrFileStatus,
    default: OcrFileStatus.Pending,
  })
  status!: OcrFileStatus;

  @OneToMany(() => OcrExecutionEntity, (execution) => execution.file, { cascade: true })
  executions!: OcrExecutionEntity[];
}
