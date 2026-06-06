import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { FiscalDocumentType, PaymentType } from '@open-receipt-ocr/types';
import { ExpenseEntity } from '@core/database/entities/expense.entity';
import { WithModificationDates } from '@core/database/entities/with-modification-dates';

@Entity('expense_extraction_feedback')
export class ExpenseExtractionFeedbackEntity extends WithModificationDates {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'expense_id', type: 'integer' })
  expenseId!: number;
  @ManyToOne(() => ExpenseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expense_id' })
  expense!: ExpenseEntity;

  @Column({ name: 'ocr_file_id', type: 'integer', nullable: true })
  ocrFileId?: number | null;

  @Column({ name: 'ocr_execution_id', type: 'integer', nullable: true })
  ocrExecutionId?: number | null;

  @Column({ name: 'document_type', type: 'varchar', default: FiscalDocumentType.Unknown })
  documentType!: FiscalDocumentType;

  @Column({ name: 'raw_ocr_json', type: 'text', nullable: true })
  rawOcrJson?: string | null;

  @Column({ name: 'raw_xml', type: 'text', nullable: true })
  rawXml?: string | null;

  @Column({ name: 'predicted_merchant_name', type: 'varchar', nullable: true })
  predictedMerchantName?: string | null;

  @Column({ name: 'corrected_merchant_name', type: 'varchar', nullable: true })
  correctedMerchantName?: string | null;

  @Column({ name: 'predicted_total_amount', type: 'real', nullable: true })
  predictedTotalAmount?: number | null;

  @Column({ name: 'corrected_total_amount', type: 'real', nullable: true })
  correctedTotalAmount?: number | null;

  @Column({ name: 'predicted_expense_date', type: 'date', nullable: true })
  predictedExpenseDate?: string | null;

  @Column({ name: 'corrected_expense_date', type: 'date', nullable: true })
  correctedExpenseDate?: string | null;

  @Column({ name: 'predicted_payment_type', type: 'varchar', nullable: true })
  predictedPaymentType?: PaymentType | null;

  @Column({ name: 'corrected_payment_type', type: 'varchar', nullable: true })
  correctedPaymentType?: PaymentType | null;

  @Column({ name: 'created_by_user_id', type: 'integer', nullable: true })
  createdByUserId?: number | null;
}
