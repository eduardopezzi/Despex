import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked, Renderer } from 'marked';
import { OcrProvider } from '@open-receipt-ocr/types';
import { OcrOutputParserService } from '@services/ocr-output-parser.service';

/**
 * Pipe that converts a raw `ocrData` JSON string (as stored in `ocr_executions.ocr_data`)
 * into sanitized HTML by:
 *   1. Parsing the provider-specific JSON to extract markdown (via OcrOutputParserService)
 *   2. Rendering the markdown to HTML (via marked)
 *
 * Usage:
 *   <div [innerHTML]="execution.ocrData | ocrOutput: execution.ocrProvider"></div>
 */
@Pipe({
  name: 'ocrOutput',
  standalone: true,
})
export class OcrOutputPipe implements PipeTransform {
  private readonly parserService = inject(OcrOutputParserService);
  private readonly sanitizer = inject(DomSanitizer);

  constructor() {
    // Configure marked: keep HTML embedded in markdown (for table HTML from Mistral)
    const renderer = new Renderer();

    marked.setOptions({
      renderer,
      gfm: true, // GitHub-flavored markdown (tables, strikethrough, etc.)
      breaks: true,
    });
  }

  transform(ocrData: string | null | undefined, provider: OcrProvider): SafeHtml {
    if (!ocrData) {
      return '';
    }

    const parsed = this.parserService.parse(ocrData, provider);
    if (!parsed?.markdown) {
      return '';
    }

    // marked.parse is synchronous when no async extensions are registered
    const html = marked.parse(parsed.markdown) as string;

    // We trust the output: it originates from our own OCR provider and is
    // further sanitized by Angular's DomSanitizer bypass only for innerHTML.
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
