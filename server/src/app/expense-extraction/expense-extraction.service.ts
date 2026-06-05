import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { ExpenseSourceType, FiscalDocumentType, PaymentType } from '@open-receipt-ocr/types';
import { extractFiscalAccessKey, getFiscalDocumentTypeFromAccessKey } from '@app/fiscal-documents/utils/access-key.util';
import { ExtractedExpenseData } from '@app/expense-extraction/expense-extraction.types';

@Injectable()
export class ExpenseExtractionService {
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    trimValues: true,
  });

  extractFromXml(rawXml?: string | null): ExtractedExpenseData {
    if (!rawXml) return {};

    const parsed = this.xmlParser.parse(rawXml) as unknown;
    const infNFe = this.findObjectByKey(parsed, 'infNFe');
    const ide = this.getObject(infNFe, 'ide');
    const emit = this.getObject(infNFe, 'emit');
    const total = this.getObject(this.getObject(infNFe, 'total'), 'ICMSTot');
    const pag = this.getObject(infNFe, 'pag');

    const id = this.getString(infNFe, '@_Id');
    const xmlAccessKey = id?.startsWith('NFe') ? id.slice(3) : extractFiscalAccessKey(rawXml);
    const model = this.getString(ide, 'mod');
    const documentType =
      model === '55' ? FiscalDocumentType.NfeModel55 : xmlAccessKey ? getFiscalDocumentTypeFromAccessKey(xmlAccessKey) : FiscalDocumentType.Unknown;

    return {
      documentType,
      sourceType: ExpenseSourceType.Xml,
      merchantName: this.cleanMerchantName(this.getString(emit, 'xNome')),
      totalAmount: this.parseAmount(this.getString(total, 'vNF')),
      expenseDate: this.normalizeDate(this.getString(ide, 'dhEmi') || this.getString(ide, 'dEmi')),
      paymentType: this.paymentTypeFromXml(pag),
      xmlAccessKey,
    };
  }

  extractFromOcrJson(rawOcrJson?: string | null): ExtractedExpenseData {
    if (!rawOcrJson) return {};

    const text = this.extractTextFromOcr(rawOcrJson);
    const accessKey = extractFiscalAccessKey(text);

    return {
      documentType: accessKey ? getFiscalDocumentTypeFromAccessKey(accessKey) : FiscalDocumentType.Unknown,
      sourceType: ExpenseSourceType.OcrJson,
      merchantName: this.extractMerchantNameFromText(text),
      totalAmount: this.extractTotalAmountFromText(text),
      expenseDate: this.extractDateFromText(text),
      paymentType: this.extractPaymentTypeFromText(text),
      xmlAccessKey: accessKey,
    };
  }

  private extractTextFromOcr(rawOcrJson: string): string {
    try {
      const parsed = JSON.parse(rawOcrJson) as unknown;
      return this.collectText(parsed).join('\n');
    } catch {
      return rawOcrJson;
    }
  }

  private collectText(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (typeof value !== 'object' || value === null) return [];
    if (Array.isArray(value)) return value.flatMap((item) => this.collectText(item));

    const record = value as Record<string, unknown>;
    const preferredKeys = ['text', 'content', 'markdown', 'rawText', 'description'];
    const preferred = preferredKeys.flatMap((key) => this.collectText(record[key]));
    const nested = Object.entries(record)
      .filter(([key]) => !preferredKeys.includes(key))
      .flatMap(([, item]) => this.collectText(item));
    return [...preferred, ...nested];
  }

  private extractMerchantNameFromText(text: string): string | null {
    const lines = this.normalizeLines(text);
    const rejected = /\b(cnpj|cpf|endereco|ender[eé]co|telefone|chave|cupom|extrato|sat|nfc-e|nf-e|danfe|valor|total)\b/i;
    const merchant = lines.find((line) => line.length >= 3 && !rejected.test(line) && !/^\d/.test(line));
    return this.cleanMerchantName(merchant);
  }

  private extractTotalAmountFromText(text: string): number | null {
    const lines = this.normalizeLines(text);
    const candidates = lines.filter((line) => /\b(valor\s+total|total|valor\s+a\s+pagar|vlr\s+total)\b/i.test(line));
    const values = candidates.flatMap((line) => this.extractAmounts(line));
    if (values.length > 0) return values[values.length - 1];

    const allValues = lines.flatMap((line) => this.extractAmounts(line));
    return allValues.length > 0 ? Math.max(...allValues) : null;
  }

  private extractDateFromText(text: string): string | null {
    const isoMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (isoMatch) return isoMatch[0];

    const brMatch = text.match(/\b(\d{2})\/(\d{2})\/(\d{2}|\d{4})\b/);
    if (!brMatch) return null;
    const [, day, month, rawYear] = brMatch;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return `${year}-${month}-${day}`;
  }

  private extractPaymentTypeFromText(text: string): PaymentType {
    const normalized = this.removeAccents(text).toLowerCase();
    if (/\b(dinheiro|especie)\b/.test(normalized)) return PaymentType.Cash;
    if (/cartao.*credito.*empresa|credito.*empresa|corporativo/.test(normalized)) return PaymentType.CompanyCreditCard;
    if (/cartao.*credito.*pessoal|credito.*pessoal/.test(normalized)) return PaymentType.PersonalCreditCard;
    if (/cartao.*credito|credito/.test(normalized)) return PaymentType.PersonalCreditCard;
    return PaymentType.Unknown;
  }

  private paymentTypeFromXml(pag: Record<string, unknown> | null): PaymentType {
    const detPag = this.getObjectOrArray(pag, 'detPag');
    const paymentCodes = detPag.map((item) => this.getString(item, 'tPag')).filter((item): item is string => !!item);
    if (paymentCodes.includes('01')) return PaymentType.Cash;
    if (paymentCodes.includes('03')) return PaymentType.PersonalCreditCard;
    return PaymentType.Unknown;
  }

  private normalizeLines(text: string): string[] {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private extractAmounts(text: string): number[] {
    const matches: string[] = Array.from(text.matchAll(/\d{1,3}(?:\.\d{3})*,\d{2}|\d+\.\d{2}|\d+,\d{2}/g), (match) => match[0]);
    return matches.map((match) => this.parseAmount(match)).filter((value): value is number => value !== null);
  }

  private parseAmount(value?: string | null): number | null {
    if (!value) return null;
    const normalized = value.includes(',') ? value.replace(/\./g, '').replace(',', '.') : value;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeDate(value?: string | null): string | null {
    if (!value) return null;
    const date = value.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    return date ?? null;
  }

  private cleanMerchantName(value?: string | null): string | null {
    if (!value) return null;
    return value.replace(/\s+/g, ' ').trim() || null;
  }

  private removeAccents(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private findObjectByKey(value: unknown, key: string): Record<string, unknown> | null {
    if (typeof value !== 'object' || value === null) return null;
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findObjectByKey(item, key);
        if (found) return found;
      }
      return null;
    }

    const record = value as Record<string, unknown>;
    const direct = this.getObject(record, key);
    if (direct) return direct;

    for (const item of Object.values(record)) {
      const found = this.findObjectByKey(item, key);
      if (found) return found;
    }
    return null;
  }

  private getObject(value: unknown, key: string): Record<string, unknown> | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const item = (value as Record<string, unknown>)[key];
    if (Array.isArray(item)) return this.asObject(item[0]);
    return this.asObject(item);
  }

  private getObjectOrArray(value: unknown, key: string): Array<Record<string, unknown>> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];
    const item = (value as Record<string, unknown>)[key];
    if (Array.isArray(item)) return item.map((entry) => this.asObject(entry)).filter((entry): entry is Record<string, unknown> => !!entry);
    const object = this.asObject(item);
    return object ? [object] : [];
  }

  private asObject(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  }

  private getString(value: unknown, key: string): string | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
    const item = (value as Record<string, unknown>)[key];
    return typeof item === 'string' ? item : null;
  }
}
