import { Injectable } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { ExpensesDao } from '@core/database/daos/expenses.dao';
import { ExpenseEntity } from '@core/database/entities/expense.entity';
import { NoTxn } from '@core/database/txn-def.interface';
import { CreateExpenseDto } from '@app/expenses/dto/create-expense.dto';
import { ExpenseQueryParams } from '@app/expenses/dto/expense-query.params';
import { UpdateExpenseDto } from '@app/expenses/dto/update-expense.dto';
import { ExpenseSourceType, FiscalDocumentType, FiscalFetchStatus, PaymentType, SortOrder } from '@open-receipt-ocr/types';
import { FiscalDocumentsService } from '@app/fiscal-documents/fiscal-documents.service';
import { ExpenseExtractionService } from '@app/expense-extraction/expense-extraction.service';
import { ExtractedExpenseData } from '@app/expense-extraction/expense-extraction.types';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly expensesDao: ExpensesDao,
    private readonly fiscalDocumentsService: FiscalDocumentsService,
    private readonly expenseExtractionService: ExpenseExtractionService,
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

  async create(dto: CreateExpenseDto): Promise<ExpenseEntity> {
    const fiscalLookup = await this.lookupFiscalSource(dto);
    const extracted = this.extractExpenseData(dto, fiscalLookup?.rawXml);

    return this.expensesDao.create(NoTxn, {
      ...this.toEntityData(dto),
      documentType: dto.documentType ?? extracted.documentType ?? fiscalLookup?.documentType ?? FiscalDocumentType.Unknown,
      sourceType: fiscalLookup?.rawXml ? ExpenseSourceType.Xml : (dto.sourceType ?? extracted.sourceType ?? ExpenseSourceType.Manual),
      rawXml: fiscalLookup?.rawXml ?? dto.rawXml,
      xmlAccessKey: dto.xmlAccessKey ?? extracted.xmlAccessKey ?? fiscalLookup?.accessKey,
      officialLookupStatus: fiscalLookup?.status ?? dto.officialLookupStatus ?? FiscalFetchStatus.NotAttempted,
      officialLookupMessage: fiscalLookup?.message ?? dto.officialLookupMessage,
      officialLookupAt: fiscalLookup ? new Date() : dto.officialLookupAt ? new Date(dto.officialLookupAt) : dto.officialLookupAt,
      merchantName: dto.merchantName ?? extracted.merchantName,
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

  update(id: number, dto: UpdateExpenseDto): Promise<ExpenseEntity> {
    return this.expensesDao.updateByPk(NoTxn, id, this.toEntityData(dto));
  }

  delete(id: number): Promise<void> {
    return this.expensesDao.deleteByPk(NoTxn, id);
  }

  private async lookupFiscalSource(dto: CreateExpenseDto) {
    const explicitAccessKey =
      dto.xmlAccessKey || this.fiscalDocumentsService.extractAccessKey(dto.rawXml) || this.fiscalDocumentsService.extractAccessKey(dto.rawOcrJson);
    if (!explicitAccessKey) return null;
    return this.fiscalDocumentsService.lookupByAccessKey(explicitAccessKey);
  }

  private extractExpenseData(dto: CreateExpenseDto, officialXml?: string): ExtractedExpenseData {
    const rawXml = officialXml ?? dto.rawXml;
    if (rawXml) {
      return this.expenseExtractionService.extractFromXml(rawXml);
    }

    const extracted = this.expenseExtractionService.extractFromOcrJson(dto.rawOcrJson);
    if (extracted.documentType === FiscalDocumentType.NfeModel55) {
      return {
        documentType: extracted.documentType,
        sourceType: extracted.sourceType,
        xmlAccessKey: extracted.xmlAccessKey,
      };
    }
    return extracted;
  }

  private toEntityData(dto: CreateExpenseDto | UpdateExpenseDto): DeepPartial<ExpenseEntity> {
    return {
      ...dto,
      officialLookupAt: dto.officialLookupAt ? new Date(dto.officialLookupAt) : dto.officialLookupAt,
    };
  }
}
