import { Injectable } from '@angular/core';
import { OcrProvider } from '@open-receipt-ocr/types';
import { MistralOcrParser } from './mistral-ocr.parser';
import { TabScannerOcrParser } from './tabscanner-ocr.parser';
import { RawJsonParser } from './raw-json.parser';
import type { ParsedOcrOutput, OcrOutputParser } from './ocr-output-parser.interface';

/**
 * Service to parse OCR output from different providers and extract markdown content.
 */
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
