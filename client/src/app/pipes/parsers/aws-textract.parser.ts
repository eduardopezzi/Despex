import { ParsedOcrOutput, OcrOutputParser } from './ocr-output-parser.interface';

interface TextractField {
  Type?: { Text?: string };
  LabelDetection?: { Text?: string };
  ValueDetection?: { Text?: string };
}

interface TextractLineItem {
  LineItemExpenseFields?: TextractField[];
}

interface TextractLineItemGroup {
  LineItems?: TextractLineItem[];
}

interface TextractExpenseDocument {
  SummaryFields?: TextractField[];
  LineItemGroups?: TextractLineItemGroup[];
}

interface TextractAnalyzeExpenseResponse {
  ExpenseDocuments?: TextractExpenseDocument[];
}

function summaryValue(fields: TextractField[] | undefined, type: string): string | undefined {
  return fields?.find((f) => f.Type?.Text === type)?.ValueDetection?.Text;
}

function lineItemValue(fields: TextractField[] | undefined, type: string): string {
  return fields?.find((f) => f.Type?.Text === type)?.ValueDetection?.Text ?? '';
}

export class AwsTextractParser implements OcrOutputParser {
  parse(rawJson: unknown): ParsedOcrOutput {
    const data = rawJson as TextractAnalyzeExpenseResponse;
    const doc = data?.ExpenseDocuments?.[0];
    if (!doc) {
      return { markdown: 'No structured data received from AWS Textract.' };
    }

    const summary = doc.SummaryFields;
    const vendor = summaryValue(summary, 'VENDOR_NAME');
    const date = summaryValue(summary, 'INVOICE_RECEIPT_DATE');
    const total = summaryValue(summary, 'TOTAL');
    const subtotal = summaryValue(summary, 'SUBTOTAL');
    const tax = summaryValue(summary, 'TAX');
    const currency = summaryValue(summary, 'CURRENCY');

    let md = `## ${vendor || 'Unknown Vendor'}\n\n`;
    if (date) md += `**Date:** ${date}\n`;
    if (subtotal) md += `**Subtotal:** ${subtotal}${currency ? ' ' + currency : ''}\n`;
    if (tax) md += `**Tax:** ${tax}${currency ? ' ' + currency : ''}\n`;
    if (total) md += `**Total:** ${total}${currency ? ' ' + currency : ''}\n`;
    md += `\n`;

    const lineItems = doc.LineItemGroups?.flatMap((g) => g.LineItems ?? []) ?? [];
    if (lineItems.length) {
      md += `| Description | Qty | Unit Price | Total |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      for (const item of lineItems) {
        const fields = item.LineItemExpenseFields;
        const desc = lineItemValue(fields, 'ITEM') || lineItemValue(fields, 'EXPENSE_ROW');
        const qty = lineItemValue(fields, 'QUANTITY');
        const unit = lineItemValue(fields, 'UNIT_PRICE');
        const rowTotal = lineItemValue(fields, 'PRICE');
        md += `| ${desc} | ${qty} | ${unit} | ${rowTotal} |\n`;
      }
      md += `\n`;
    }

    return {
      markdown: md,
      meta: { vendor, date, total },
    };
  }
}
