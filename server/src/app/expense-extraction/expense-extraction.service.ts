import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { ExpenseSourceType, FiscalDocumentType, PaymentType } from '@open-receipt-ocr/types';
import { extractFiscalAccessKey, getFiscalDocumentTypeFromAccessKey } from '@app/fiscal-documents/utils/access-key.util';
import { ExtractedExpenseData } from '@app/expense-extraction/expense-extraction.types';

interface OcrTextBlock {
  text: string;
  bbox?: unknown;
}

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
      merchantTaxId: this.normalizeTaxId(this.getString(emit, 'CNPJ') || this.getString(emit, 'CPF')),
      totalAmount: this.parseAmount(this.getString(total, 'vNF')),
      expenseDate: this.normalizeDate(this.getString(ide, 'dhEmi') || this.getString(ide, 'dEmi')),
      paymentType: this.paymentTypeFromXml(pag),
      xmlAccessKey,
    };
  }

  extractFromOcrJson(rawOcrJson?: string | null): ExtractedExpenseData {
    if (!rawOcrJson) return {};

    const text = this.extractTextFromOcr(rawOcrJson);
    const qrCodeUrl = this.extractFiscalQrCodeUrl(text);
    const accessKey = extractFiscalAccessKey(qrCodeUrl) ?? extractFiscalAccessKey(text);

    return {
      documentType: accessKey ? getFiscalDocumentTypeFromAccessKey(accessKey) : FiscalDocumentType.Unknown,
      sourceType: ExpenseSourceType.OcrJson,
      merchantName: this.extractMerchantNameFromText(text),
      merchantTaxId: this.extractTaxIdFromText(text),
      totalAmount: this.extractTotalAmountFromText(text),
      expenseDate: this.extractDateFromText(text),
      paymentType: this.extractPaymentTypeFromText(text),
      xmlAccessKey: accessKey,
      fiscalQrCodeUrl: qrCodeUrl,
    };
  }

  private extractTextFromOcr(rawOcrJson: string): string {
    try {
      const parsed = JSON.parse(rawOcrJson) as unknown;
      const visualLines = this.extractVisualLines(parsed);
      return visualLines.length > 0 ? visualLines.join('\n') : this.collectText(parsed).join('\n');
    } catch {
      return rawOcrJson;
    }
  }

  private extractVisualLines(value: unknown): string[] {
    const blocks = this.collectOcrTextBlocks(value).filter((block) => block.text.trim());
    const positionedBlocks = blocks
      .map((block) => {
        const box = this.normalizeBBox(block.bbox);
        if (!box) return null;
        const y = box.reduce((sum, point) => sum + point.y, 0) / box.length;
        const x = Math.min(...box.map((point) => point.x));
        const height = Math.max(...box.map((point) => point.y)) - Math.min(...box.map((point) => point.y));
        return { text: block.text.trim(), x, y, height };
      })
      .filter((block): block is { text: string; x: number; y: number; height: number } => !!block)
      .sort((a, b) => a.y - b.y || a.x - b.x);

    if (positionedBlocks.length === 0) return [];

    const lines: Array<Array<{ text: string; x: number; y: number; height: number }>> = [];
    for (const block of positionedBlocks) {
      const lastLine = lines[lines.length - 1];
      const tolerance = Math.max(12, block.height * 0.55);
      const lastY = lastLine ? lastLine.reduce((sum, item) => sum + item.y, 0) / lastLine.length : 0;

      if (lastLine && Math.abs(block.y - lastY) <= tolerance) {
        lastLine.push(block);
      } else {
        lines.push([block]);
      }
    }

    return lines.map((line) =>
      line
        .sort((a, b) => a.x - b.x)
        .map((block) => block.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    );
  }

  private collectOcrTextBlocks(value: unknown): OcrTextBlock[] {
    if (typeof value !== 'object' || value === null) return [];
    if (Array.isArray(value)) return value.flatMap((item) => this.collectOcrTextBlocks(item));

    const record = value as Record<string, unknown>;
    const text = record.text;
    if (typeof text === 'string') {
      return [{ text, bbox: record.bbox }];
    }

    return Object.values(record).flatMap((item) => this.collectOcrTextBlocks(item));
  }

  private normalizeBBox(value: unknown): Array<{ x: number; y: number }> | null {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      const x = record.x;
      const y = record.y;
      const width = record.width;
      const height = record.height;
      if ([x, y, width, height].every((item) => typeof item === 'number')) {
        const left = x as number;
        const top = y as number;
        const right = left + (width as number);
        const bottom = top + (height as number);
        return [
          { x: left, y: top },
          { x: right, y: top },
          { x: right, y: bottom },
          { x: left, y: bottom },
        ];
      }
    }

    if (!Array.isArray(value)) return null;

    if (value.length === 4 && value.every((item) => typeof item === 'number')) {
      const [x1, y1, x2, y2] = value;
      return [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 },
      ];
    }

    const points = value
      .map((item) => {
        if (!Array.isArray(item) || item.length < 2) return null;
        const tuple = item as unknown[];
        const x = tuple[0];
        const y = tuple[1];
        return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
      })
      .filter((item): item is { x: number; y: number } => !!item);

    return points.length >= 2 ? points : null;
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
    const tableStartIndex = lines.findIndex((line) => this.isItemsOrPaymentSectionLine(line));
    const headerLines = tableStartIndex >= 0 ? lines.slice(0, tableStartIndex) : lines;
    const merchant =
      headerLines.find((line) => this.isLikelyLegalName(line)) ??
      headerLines.find((line) => this.isMerchantCandidate(line)) ??
      lines.find((line) => this.isLikelyLegalName(line)) ??
      lines.find((line) => this.isMerchantCandidate(line));
    return this.cleanMerchantName(merchant);
  }

  private extractTotalAmountFromText(text: string): number | null {
    const lines = this.normalizeLines(text);
    const anchors = ['total', 'valor total', 'valor a pagar', 'valor liquido', 'vlr total', 'pagar'];
    for (let index = 0; index < lines.length; index += 1) {
      if (!this.hasApproximateAnchor(lines[index], anchors)) continue;

      const values = this.extractAmounts(lines[index]);
      if (values.length > 0) return values[values.length - 1];

      const nextValues = lines[index + 1] ? this.extractAmounts(lines[index + 1]) : [];
      if (nextValues.length > 0) return nextValues[0];
    }

    const allValues = lines.flatMap((line) => this.extractAmounts(line));
    return allValues.length > 0 ? Math.max(...allValues) : null;
  }

  private extractDateFromText(text: string): string | null {
    const isoMatch = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (isoMatch) return isoMatch[0];

    const normalized = text.replace(/(\d{2})(\d{2})(\d{4})(?=\s+\d{1,2}[:h]\d{2})/g, '$1/$2/$3');
    const brMatch = normalized.match(/\b(\d{2})[/.\-\s](\d{2})[/.\-\s](\d{2}|\d{4})\b/);
    if (!brMatch) return null;
    const [, day, month, rawYear] = brMatch;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    if (!this.isValidDateParts(day, month, year)) return null;
    return `${year}-${month}-${day}`;
  }

  private extractPaymentTypeFromText(text: string): PaymentType {
    const normalized = this.removeAccents(text).toLowerCase();
    if (/dinheiro|especie|pagamento\s*em\s*dinheiro/.test(normalized)) return PaymentType.Cash;
    if (/cart[aã]o.*credito.*empresa|credito.*empresa|corporativo/.test(normalized)) return PaymentType.CompanyCreditCard;
    if (/cart[aã]o.*credito.*pessoal|credito.*pessoal/.test(normalized)) return PaymentType.PersonalCreditCard;
    if (/cart[aã]o.*credito|credito/.test(normalized)) return PaymentType.PersonalCreditCard;
    return PaymentType.Unknown;
  }

  private paymentTypeFromXml(pag: Record<string, unknown> | null): PaymentType {
    const detPag = this.getObjectOrArray(pag, 'detPag');
    const paymentCodes = detPag.map((item) => this.getString(item, 'tPag')).filter((item): item is string => !!item);
    if (paymentCodes.includes('01')) return PaymentType.Cash;
    if (paymentCodes.includes('03')) return PaymentType.PersonalCreditCard;
    return PaymentType.Unknown;
  }

  private extractTaxIdFromText(text: string): string | null {
    const formatted = text.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/);
    if (formatted) return this.normalizeTaxId(formatted[0]);

    const cnpjAnchor = text.match(/cnpj\D{0,20}(\d[\d\s./-]{12,25}\d)/i);
    if (cnpjAnchor) return this.normalizeTaxId(cnpjAnchor[1]);

    return null;
  }

  private extractFiscalQrCodeUrl(text: string): string | null {
    for (const line of this.normalizeLines(text)) {
      const normalized = line.replace(/\s+/g, '');
      const urlMatch = normalized.match(/https?:\/\/[^\s"'<>]+/i);
      if (urlMatch) return this.cleanFiscalUrl(urlMatch[0]);

      const sefazPath = normalized.match(/(?:www\.)?[a-z0-9.-]*sefaz[a-z0-9./?=&;:%-]+/i);
      if (sefazPath) {
        const value = sefazPath[0].startsWith('http') ? sefazPath[0] : `https://${sefazPath[0]}`;
        return this.cleanFiscalUrl(value);
      }
    }

    return null;
  }

  private normalizeLines(text: string): string[] {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private isItemsOrPaymentSectionLine(line: string): boolean {
    const normalized = this.removeAccents(line).toLowerCase();
    return /cod|codigo|descri|qtd|qtde|quant|un\.?|unit|valor\s+total|forma\s*pagamento|valor\s+pago|pagamento/.test(normalized);
  }

  private isMerchantCandidate(line: string): boolean {
    const normalized = this.removeAccents(line).toLowerCase().replace(/\s+/g, ' ').trim();
    const letters = normalized.replace(/[^a-z]/g, '');

    if (letters.length < 4) return false;
    if (/^\d/.test(normalized)) return false;
    if ((normalized.match(/\d/g) ?? []).length > letters.length) return false;
    if (this.looksLikeBrokenSingleWordHeader(normalized)) return false;

    const rejected =
      /cnpj|cpf|fone|telefone|endereco|chave|acesso|consulta|consulte|cupom|extrato|sat|nfc\s*-?\s*e|nf\s*-?\s*e|danfe|nota fiscal|documento auxiliar|docmento auxiliar|consumidor eletron|consumidor nao identificado|valor|total|forma|pagamento|dinheiro|cartao|credito|debito|protocolo|serie|data|hora|http|www|sefaz|receita|tribut|fisco|qtd|qtde|unit|un\b|buffet|refrigerante|coca|janta|residencia|castelo|auxiliar/;

    return !rejected.test(normalized);
  }

  private isLikelyLegalName(line: string): boolean {
    const normalized = this.removeAccents(line).toLowerCase();
    if (!this.isMerchantCandidate(line)) return false;
    return /\b(ltda|eireli|me|epp|sa|s\/a|comercio|restaurante|lancheria|churrascaria|mercado|posto|hotel|padaria)\b/.test(normalized);
  }

  private looksLikeBrokenSingleWordHeader(normalized: string): boolean {
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length > 1) return false;
    const word = words[0] ?? '';
    return word.length <= 14 && /(residencia|scresidencia|foscresidencia|eletronica|consumidor)/.test(word);
  }

  private extractAmounts(text: string): number[] {
    const matches: string[] = Array.from(text.matchAll(/\d{1,3}(?:\.\d{3})*,\d{2}|\d+\.\d{2}|\d+,\d{2}/g), (match) => match[0]);
    return matches.map((match) => this.parseAmount(match)).filter((value): value is number => value !== null);
  }

  private hasApproximateAnchor(line: string, anchors: string[]): boolean {
    const normalized = this.normalizeForSimilarity(line);
    if (!normalized) return false;

    return anchors.some((anchor) => {
      const normalizedAnchor = this.normalizeForSimilarity(anchor);
      if (normalized.includes(normalizedAnchor)) return true;

      const words = normalized.split(/\s+/);
      const anchorWords = normalizedAnchor.split(/\s+/);
      if (anchorWords.length === 1) {
        return words.some((word) => this.similarity(word, normalizedAnchor) >= 0.75);
      }

      return words.some((_, index) => this.similarity(words.slice(index, index + anchorWords.length).join(' '), normalizedAnchor) >= 0.75);
    });
  }

  private normalizeForSimilarity(value: string): string {
    return this.removeAccents(value)
      .toLowerCase()
      .replace(/[0]/g, 'o')
      .replace(/[1]/g, 'i')
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private similarity(left: string, right: string): number {
    if (left === right) return 1;
    if (!left || !right) return 0;
    const distance = this.levenshteinDistance(left, right);
    return 1 - distance / Math.max(left.length, right.length);
  }

  private levenshteinDistance(left: string, right: string): number {
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

    for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
      let diagonal = previous[0];
      previous[0] = leftIndex + 1;

      for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
        const deletion = previous[rightIndex + 1] + 1;
        const insertion = previous[rightIndex] + 1;
        const substitution = diagonal + (left[leftIndex] === right[rightIndex] ? 0 : 1);
        diagonal = previous[rightIndex + 1];
        previous[rightIndex + 1] = Math.min(deletion, insertion, substitution);
      }
    }

    return previous[right.length];
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

  private normalizeTaxId(value?: string | null): string | null {
    if (!value) return null;
    const digits = value.replace(/\D/g, '');
    return digits.length === 14 || digits.length === 11 ? digits : null;
  }

  private cleanFiscalUrl(value: string): string {
    return value.replace(/[),.;]+$/g, '');
  }

  private isValidDateParts(day: string, month: string, year: string): boolean {
    const dayNumber = Number(day);
    const monthNumber = Number(month);
    const yearNumber = Number(year);
    if (yearNumber < 2000 || yearNumber > 2100 || monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return false;
    const date = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));
    return date.getUTCFullYear() === yearNumber && date.getUTCMonth() === monthNumber - 1 && date.getUTCDate() === dayNumber;
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
