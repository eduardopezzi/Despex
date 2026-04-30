import { ParsedOcrOutput, OcrOutputParser } from './ocr-output-parser.interface';

interface TabScannerLineItem {
  desc: string;
  qty: number;
  price: string;
  lineTotal: string;
}

interface TabScannerOcrResponse {
  result: {
    establishment: string;
    total: string;
    currency: string;
    date: string;
    lineItems: TabScannerLineItem[];
  };
}

export class TabScannerOcrParser implements OcrOutputParser {
  parse(rawJson: unknown): ParsedOcrOutput {
    const data = rawJson as TabScannerOcrResponse;
    const result = data?.result;
    if (!result) {
      return { markdown: 'No structured data received from TabScanner.' };
    }
    let md = `## ${result.establishment || 'Unknown Establishment'}\n\n`;
    md += `**Date:** ${result.date || 'N/A'}\n`;
    md += `**Total:** ${result.total || '0.00'} ${result.currency || ''}\n\n`;
    if (result.lineItems?.length) {
      md += `| Description | Qty | Price | Total |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      for (const item of result.lineItems) {
        md += `| ${item.desc} | ${item.qty} | ${item.price} | ${item.lineTotal} |\n`;
      }
      md += `\n`;
    }
    return {
      markdown: md,
      meta: {
        establishment: result.establishment,
        total: result.total,
        date: result.date,
      },
    };
  }
}
