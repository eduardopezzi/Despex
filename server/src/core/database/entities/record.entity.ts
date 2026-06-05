import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { RecordType } from '@open-receipt-ocr/types';
import { WithModificationDates } from '@core/database/entities/with-modification-dates';

@Entity('records')
export class RecordEntity extends WithModificationDates {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'name', type: 'varchar' })
  name!: string;

  @Column({ name: 'type', type: 'varchar' })
  type!: RecordType;

  @Column({ name: 'created_by_user_id', type: 'integer', nullable: true })
  createdByUserId?: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
