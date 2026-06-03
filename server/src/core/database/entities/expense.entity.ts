import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ExpenseSourceType, FiscalDocumentType, FiscalFetchStatus, PaymentType } from '@open-receipt-ocr/types';
import { WithModificationDates } from '@core/database/entities/with-modification-dates';
import { OcrExecutionEntity } from '@core/database/entities/ocr-execution.entity';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';
import { OcrJobEntity } from '@core/database/entities/ocr-job.entity';

@Entity('expenses')
export class ExpenseEntity extends WithModificationDates {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'ocr_job_id', type: 'integer', nullable: true })
  ocrJobId?: number | null;
  @ManyToOne(() => OcrJobEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ocr_job_id' })
  ocrJob?: OcrJobEntity | null;

  @Column({ name: 'ocr_file_id', type: 'integer', nullable: true })
  ocrFileId?: number | null;
  @ManyToOne(() => OcrFileEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ocr_file_id' })
  ocrFile?: OcrFileEntity | null;

  @Column({ name: 'ocr_execution_id', type: 'integer', nullable: true })
  ocrExecutionId?: number | null;
  @ManyToOne(() => OcrExecutionEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ocr_execution_id' })
  ocrExecution?: OcrExecutionEntity | null;

  @Column({ name: 'document_type', type: 'varchar', default: FiscalDocumentType.Unknown })
  documentType!: FiscalDocumentType;

  @Column({ name: 'source_type', type: 'varchar', default: ExpenseSourceType.Manual })
  sourceType!: ExpenseSourceType;

  @Column({ name: 'raw_ocr_json', type: 'text', nullable: true })
  rawOcrJson?: string | null;

  @Column({ name: 'raw_xml', type: 'text', nullable: true })
  rawXml?: string | null;

  @Column({ name: 'xml_access_key', type: 'varchar', nullable: true })
  xmlAccessKey?: string | null;

  @Column({ name: 'official_lookup_status', type: 'varchar', default: FiscalFetchStatus.NotAttempted })
  officialLookupStatus!: FiscalFetchStatus;

  @Column({ name: 'official_lookup_message', type: 'text', nullable: true })
  officialLookupMessage?: string | null;

  @Column({ name: 'official_lookup_at', type: 'datetime', nullable: true })
  officialLookupAt?: Date | null;

  @Column({ name: 'merchant_name', type: 'varchar', nullable: true })
  merchantName?: string | null;

  @Column({ name: 'total_amount', type: 'real', nullable: true })
  totalAmount?: number | null;

  @Column({ name: 'expense_date', type: 'date', nullable: true })
  expenseDate?: string | null;

  @Column({ name: 'payment_type', type: 'varchar', default: PaymentType.Unknown })
  paymentType!: PaymentType;

  @Column({ name: 'owner_user_id', type: 'integer', nullable: true })
  ownerUserId?: number | null;

  @Column({ name: 'client_record_id', type: 'integer', nullable: true })
  clientRecordId?: number | null;

  @Column({ name: 'is_company_expense', type: 'boolean', default: false })
  isCompanyExpense!: boolean;

  @Column({ name: 'expense_type_record_id', type: 'integer', nullable: true })
  expenseTypeRecordId?: number | null;

  @Column({ name: 'reimbursement_date', type: 'date', nullable: true })
  reimbursementDate?: string | null;

  @Column({ name: 'is_reimbursed', type: 'boolean', default: false })
  isReimbursed!: boolean;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'created_by_user_id', type: 'integer', nullable: true })
  createdByUserId?: number | null;

  @Column({ name: 'updated_by_user_id', type: 'integer', nullable: true })
  updatedByUserId?: number | null;
}
