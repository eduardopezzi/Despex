import { BadRequestException, Injectable } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { ExpensesDao } from '@core/database/daos/expenses.dao';
import { ExpenseExtractionFeedbackDao } from '@core/database/daos/expense-extraction-feedback.dao';
import { MerchantAliasesDao } from '@core/database/daos/merchant-aliases.dao';
import { ExpenseExtractionFeedbackEntity } from '@core/database/entities/expense-extraction-feedback.entity';
import { ExpenseEntity } from '@core/database/entities/expense.entity';
import { NoTxn } from '@core/database/txn-def.interface';
import { CreateExpenseDto } from '@app/expenses/dto/create-expense.dto';
import { ExpenseQueryParams } from '@app/expenses/dto/expense-query.params';
import { UpdateExpenseDto } from '@app/expenses/dto/update-expense.dto';
import { ExpenseSourceType, FiscalDocumentType, FiscalFetchStatus, PaymentType, RecordType, SortOrder } from '@open-receipt-ocr/types';
import { FiscalDocumentsService } from '@app/fiscal-documents/fiscal-documents.service';
import { ExpenseExtractionService } from '@app/expense-extraction/expense-extraction.service';
import { ExtractedExpenseData } from '@app/expense-extraction/expense-extraction.types';
import { RecordsService } from '@app/records/records.service';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expensesDao: ExpensesDao,
    private readonly expenseExtractionFeedbackDao: ExpenseExtractionFeedbackDao,
    private readonly merchantAliasesDao: MerchantAliasesDao,
    private readonly fiscalDocumentsService: FiscalDocumentsService,
    private readonly expenseExtractionService: ExpenseExtractionService,
    private readonly recordsService: RecordsService,
  ) {}

  findAll(params: ExpenseQueryParams): Promise<[ExpenseEntity[], number]> {
    const { page, pageSize } = params;
    const skip = page && pageSize ? (page - 1) * pageSize : undefined;

    return this.expensesDao.findAll(NoTxn, {
      ...params,
      skip,
      take: pageSize,
      sortField: params.sortField || 'createdAt',
      sortOrder: params.sortOrder || SortOrder.DESC,
    });
  }

  findExtractionFeedback(page = 1, pageSize = 50): Promise<[ExpenseExtractionFeedbackEntity[], number]> {
    return Promise.all([
      this.expenseExtractionFeedbackDao.getAll(NoTxn, {
        skip: (page - 1) * pageSize,
        take: pageSize,
        order: { createdAt: 'DESC', id: 'DESC' },
      }),
      this.expenseExtractionFeedbackDao.count(NoTxn),
    ]);
  }

  async create(dto: CreateExpenseDto): Promise<ExpenseEntity> {
    await this.validateRecordRelations(dto);
    const fiscalLookup = await this.lookupFiscalSource(dto);
    const extracted = await this.extractExpenseData(dto, fiscalLookup?.rawXml);

    return this.expensesDao.create(NoTxn, {
      ...this.toEntityData(dto),
      documentType: dto.documentType ?? extracted.documentType ?? fiscalLookup?.documentType ?? FiscalDocumentType.Unknown,
      sourceType: fiscalLookup?.rawXml ? ExpenseSourceType.Xml : (dto.sourceType ?? extracted.sourceType ?? ExpenseSourceType.Manual),
      rawXml: fiscalLookup?.rawXml ?? dto.rawXml,
      xmlAccessKey: dto.xmlAccessKey ?? extracted.xmlAccessKey ?? fiscalLookup?.accessKey,
      fiscalQrCodeUrl: dto.fiscalQrCodeUrl ?? extracted.fiscalQrCodeUrl,
      officialLookupStatus: fiscalLookup?.status ?? dto.officialLookupStatus ?? FiscalFetchStatus.NotAttempted,
      officialLookupMessage: fiscalLookup?.message ?? dto.officialLookupMessage,
      officialLookupAt: fiscalLookup ? new Date() : dto.officialLookupAt ? new Date(dto.officialLookupAt) : dto.officialLookupAt,
      merchantName: dto.merchantName ?? extracted.merchantName,
      merchantTaxId: dto.merchantTaxId ?? extracted.merchantTaxId,
      totalAmount: dto.totalAmount ?? extracted.totalAmount,
      expenseDate: dto.expenseDate ?? extracted.expenseDate,
      paymentType: dto.paymentType ?? extracted.paymentType ?? PaymentType.Unknown,
      isCompanyExpense: dto.isCompanyExpense ?? false,
      isReimbursed: dto.isReimbursed ?? false,
    });
  }

  getExpense(id: number): Promise<ExpenseEntity> {
    return this.expensesDao.getOneByPkOrFail(NoTxn, id);
  }

  async update(id: number, dto: UpdateExpenseDto): Promise<ExpenseEntity> {
    await this.validateRecordRelations(dto);
    const current = await this.getExpense(id);
    await this.recordExtractionFeedback(current, dto);
    return this.expensesDao.updateByPk(NoTxn, id, this.toEntityData(dto));
  }

  async reextract(id: number): Promise<ExpenseEntity> {
    const expense = await this.getExpense(id);
    const source = {
      rawXml: expense.rawXml,
      rawOcrJson: expense.rawOcrJson,
      xmlAccessKey: expense.xmlAccessKey,
      fiscalQrCodeUrl: expense.fiscalQrCodeUrl,
      sourceType: expense.sourceType,
      documentType: expense.documentType,
    };
    const fiscalLookup = await this.lookupFiscalSource(source);
    const extracted = await this.extractExpenseData(source, fiscalLookup?.rawXml);
    const canUseExtractedBusinessData = extracted.documentType !== FiscalDocumentType.NfeModel55 || !!fiscalLookup?.rawXml || !!expense.rawXml;

    return this.expensesDao.updateByPk(NoTxn, id, {
      documentType: extracted.documentType ?? fiscalLookup?.documentType ?? expense.documentType,
      sourceType: fiscalLookup?.rawXml ? ExpenseSourceType.Xml : (extracted.sourceType ?? expense.sourceType),
      rawXml: fiscalLookup?.rawXml ?? expense.rawXml,
      xmlAccessKey: extracted.xmlAccessKey ?? fiscalLookup?.accessKey ?? expense.xmlAccessKey,
      fiscalQrCodeUrl: extracted.fiscalQrCodeUrl ?? expense.fiscalQrCodeUrl,
      officialLookupStatus: fiscalLookup?.status ?? expense.officialLookupStatus,
      officialLookupMessage: fiscalLookup?.message ?? expense.officialLookupMessage,
      officialLookupAt: fiscalLookup ? new Date() : expense.officialLookupAt,
      merchantName: canUseExtractedBusinessData ? (extracted.merchantName ?? null) : expense.merchantName,
      merchantTaxId: extracted.merchantTaxId ?? expense.merchantTaxId,
      totalAmount: canUseExtractedBusinessData ? (extracted.totalAmount ?? null) : expense.totalAmount,
      expenseDate: canUseExtractedBusinessData ? (extracted.expenseDate ?? null) : expense.expenseDate,
      paymentType: canUseExtractedBusinessData ? (extracted.paymentType ?? PaymentType.Unknown) : expense.paymentType,
    });
  }

  delete(id: number): Promise<void> {
    return this.expensesDao.deleteByPk(NoTxn, id);
  }

  private async lookupFiscalSource(dto: CreateExpenseDto) {
    const explicitAccessKey =
      dto.xmlAccessKey ||
      this.fiscalDocumentsService.extractAccessKey(dto.fiscalQrCodeUrl) ||
      this.fiscalDocumentsService.extractAccessKey(dto.rawXml) ||
      this.fiscalDocumentsService.extractAccessKey(dto.rawOcrJson);
    if (!explicitAccessKey) return null;
    return this.fiscalDocumentsService.lookupByAccessKey(explicitAccessKey);
  }

  private async validateRecordRelations(dto: Pick<CreateExpenseDto, 'clientRecordId' | 'expenseTypeRecordId'>): Promise<void> {
    if (dto.clientRecordId !== undefined && dto.clientRecordId !== null) {
      await this.assertRecord(dto.clientRecordId, RecordType.Client, 'clientRecordId');
    }
    if (dto.expenseTypeRecordId !== undefined && dto.expenseTypeRecordId !== null) {
      await this.assertRecord(dto.expenseTypeRecordId, RecordType.ExpenseType, 'expenseTypeRecordId');
    }
  }

  private async assertRecord(id: number, expectedType: RecordType, fieldName: string): Promise<void> {
    const record = await this.recordsService.getRecord(id);
    if (record.type !== expectedType) {
      throw new BadRequestException(`${fieldName} must reference a ${expectedType} record.`);
    }
    if (!record.isActive) {
      throw new BadRequestException(`${fieldName} must reference an active record.`);
    }
  }

  private async extractExpenseData(dto: CreateExpenseDto, officialXml?: string): Promise<ExtractedExpenseData> {
    const rawXml = officialXml ?? dto.rawXml;
    if (rawXml) {
      return this.enrichWithMerchantAlias(this.expenseExtractionService.extractFromXml(rawXml));
    }

    const extracted = this.expenseExtractionService.extractFromOcrJson(dto.rawOcrJson);
    if (extracted.documentType === FiscalDocumentType.NfeModel55) {
      return {
        documentType: extracted.documentType,
        sourceType: extracted.sourceType,
        xmlAccessKey: extracted.xmlAccessKey,
        fiscalQrCodeUrl: extracted.fiscalQrCodeUrl,
        merchantTaxId: extracted.merchantTaxId,
      };
    }
    return this.enrichWithMerchantAlias(extracted);
  }

  private toEntityData(dto: CreateExpenseDto | UpdateExpenseDto): DeepPartial<ExpenseEntity> {
    return {
      ...dto,
      officialLookupAt: dto.officialLookupAt ? new Date(dto.officialLookupAt) : dto.officialLookupAt,
    };
  }

  private async recordExtractionFeedback(current: ExpenseEntity, dto: UpdateExpenseDto): Promise<void> {
    if (!current.rawOcrJson && !current.rawXml) return;

    const correctedMerchantName = this.changedValue(current.merchantName, dto.merchantName);
    const correctedTotalAmount = this.changedValue(current.totalAmount, dto.totalAmount);
    const correctedExpenseDate = this.changedValue(current.expenseDate, dto.expenseDate);
    const correctedPaymentType = this.changedValue(current.paymentType, dto.paymentType);

    if (
      correctedMerchantName === undefined &&
      correctedTotalAmount === undefined &&
      correctedExpenseDate === undefined &&
      correctedPaymentType === undefined
    ) {
      return;
    }

    await this.expenseExtractionFeedbackDao.create(NoTxn, {
      expenseId: current.id,
      ocrFileId: current.ocrFileId,
      ocrExecutionId: current.ocrExecutionId,
      documentType: current.documentType,
      rawOcrJson: current.rawOcrJson,
      rawXml: current.rawXml,
      predictedMerchantName: current.merchantName,
      correctedMerchantName: correctedMerchantName !== undefined ? correctedMerchantName : current.merchantName,
      predictedTotalAmount: current.totalAmount,
      correctedTotalAmount: correctedTotalAmount !== undefined ? correctedTotalAmount : current.totalAmount,
      predictedExpenseDate: current.expenseDate,
      correctedExpenseDate: correctedExpenseDate !== undefined ? correctedExpenseDate : current.expenseDate,
      predictedPaymentType: current.paymentType,
      correctedPaymentType: correctedPaymentType !== undefined ? correctedPaymentType : current.paymentType,
      createdByUserId: dto.updatedByUserId ?? null,
    });

    if (correctedMerchantName) {
      await this.recordMerchantAlias(current, correctedMerchantName);
    }
  }

  private changedValue<T>(currentValue: T | null | undefined, nextValue: T | null | undefined): T | null | undefined {
    if (nextValue === undefined) return undefined;
    return currentValue === nextValue ? undefined : nextValue;
  }

  private async enrichWithMerchantAlias(extracted: ExtractedExpenseData): Promise<ExtractedExpenseData> {
    const normalizedAliasName = this.normalizeMerchantAlias(extracted.merchantName);
    const alias = await this.merchantAliasesDao.findBestMatch(NoTxn, extracted.merchantTaxId, normalizedAliasName);
    if (!alias) return extracted;

    return {
      ...extracted,
      merchantName: alias.canonicalName,
      merchantTaxId: extracted.merchantTaxId ?? alias.merchantTaxId,
    };
  }

  private async recordMerchantAlias(expense: ExpenseEntity, correctedMerchantName: string): Promise<void> {
    const normalizedAliasName = this.normalizeMerchantAlias(expense.merchantName);
    const canonicalName = correctedMerchantName.trim();
    if (!canonicalName || canonicalName === expense.merchantName || (!normalizedAliasName && !expense.merchantTaxId)) return;

    await this.merchantAliasesDao.upsertAlias(NoTxn, {
      merchantTaxId: expense.merchantTaxId,
      aliasName: expense.merchantName || canonicalName,
      normalizedAliasName: normalizedAliasName || this.normalizeMerchantAlias(canonicalName) || canonicalName.toLowerCase(),
      canonicalName,
    });
  }

  private normalizeMerchantAlias(value?: string | null): string | null {
    if (!value) return null;
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\b(ltda|eireli|me|epp|sa|s a)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return normalized || null;
  }
}
