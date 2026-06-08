import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { WithModificationDates } from '@core/database/entities/with-modification-dates';

@Entity('merchant_aliases')
@Index(['merchantTaxId'])
@Index(['normalizedAliasName'])
export class MerchantAliasEntity extends WithModificationDates {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'merchant_tax_id', type: 'varchar', nullable: true })
  merchantTaxId?: string | null;

  @Column({ name: 'alias_name', type: 'varchar' })
  aliasName!: string;

  @Column({ name: 'normalized_alias_name', type: 'varchar' })
  normalizedAliasName!: string;

  @Column({ name: 'canonical_name', type: 'varchar' })
  canonicalName!: string;

  @Column({ name: 'source', type: 'varchar', default: 'manual_correction' })
  source!: string;

  @Column({ name: 'hit_count', type: 'integer', default: 1 })
  hitCount!: number;
}
