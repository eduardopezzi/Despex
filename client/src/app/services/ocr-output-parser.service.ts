import { Injectable } from '@angular/core';
import { OcrProvider } from '@open-receipt-ocr/types';

/**
 * Parsed OCR result with extracted markdown content.
 * Tables are inlined as HTML within the markdown body.
 */
export interface ParsedOcrOutput {
  markdown: string;
  /** Metadata extracted from the provider response (e.g. model used, pages processed) */
  meta?: Record<string, unknown>;
}

/** Strategy interface for per-provider data extraction */
interface OcrOutputParser {
  parse(rawJson: unknown): ParsedOcrOutput;
}

// ---------------------------------------------------------------------------
// Mistral parser
// ---------------------------------------------------------------------------

interface MistralPage {
  index: number;
  markdown: string;
  tables?: { id: string; content: string; format: string }[];
}

interface MistralOcrResponse {
  pages: MistralPage[];
  model: string;
  usageInfo?: { pagesProcessed: number; docSizeBytes: number };
}

class MistralOcrParser implements OcrOutputParser {
  parse(rawJson: unknown): ParsedOcrOutput {
    const data = rawJson as MistralOcrResponse;

    if (!data?.pages?.length) {
      return { markdown: '' };
    }

    const pageMarkdowns = data.pages.map((page) => {
      let md = page.markdown ?? '';

      // Replace table references with the actual HTML content
      if (page.tables?.length) {
        for (const table of page.tables) {
          const ref = `[${table.id}](${table.id})`;
          md = md.replace(ref, '\n\n' + table.content + '\n\n');
        }
      }

      return md;
    });

    const markdown = pageMarkdowns.join('\n\n---\n\n');

    return {
      markdown,
      meta: {
        model: data.model,
        pagesProcessed: data.usageInfo?.pagesProcessed,
        docSizeBytes: data.usageInfo?.docSizeBytes,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// TabScanner parser
// ---------------------------------------------------------------------------

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

class TabScannerOcrParser implements OcrOutputParser {
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

// ---------------------------------------------------------------------------
// Fallback / unknown-provider parser — renders raw JSON in a code block
// ---------------------------------------------------------------------------

class RawJsonParser implements OcrOutputParser {
  parse(rawJson: unknown): ParsedOcrOutput {
    return {
      markdown: '```json\n' + JSON.stringify(rawJson, null, 2) + '\n```',
    };
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class OcrOutputParserService {
  private readonly parsers: Partial<Record<OcrProvider, OcrOutputParser>> = {
    [OcrProvider.Mistral]: new MistralOcrParser(),
    [OcrProvider.TabScanner]: new TabScannerOcrParser(),
  };

  private readonly fallbackParser = new RawJsonParser();

  /**
   * Parse a raw `ocrData` string (JSON) for the given provider and return
   * the extracted markdown.
   *
   * Returns `null` when `ocrData` is null/undefined/empty.
   */
  parse(ocrData: string | null | undefined, provider: OcrProvider): ParsedOcrOutput | null {
    if (!ocrData) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(ocrData);
    } catch {
      // Not valid JSON — treat the raw string as markdown
      return { markdown: ocrData };
    }

    const parser = this.parsers[provider] ?? this.fallbackParser;
    return parser.parse(parsed);
  }
}
