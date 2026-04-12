import { ParsedOcrOutput, OcrOutputParser } from '@app/pipes/parsers/ocr-output-parser.interface';

interface PaddleOcrBlock {
  /** Text from the block */
  text: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Bounding box information */
  bbox: unknown;
}

interface PaddleOcrPage {
  blocks: PaddleOcrBlock[];
}

interface PaddleOcrLocalResponse {
  pages: PaddleOcrPage[];
  model: string;
  provider: string;
}

export class PaddleOcrLocalParser implements OcrOutputParser {
  parse(rawJson: unknown): ParsedOcrOutput {
    const data = rawJson as PaddleOcrLocalResponse;

    if (!data?.pages?.length) {
      return { markdown: '' };
    }

    const pageMarkdowns = data.pages.map((page) => {
      if (!page?.blocks?.length) {
        return '';
      }

      // Extract text from blocks and join them
      const lines: string[] = [];
      for (const block of page.blocks) {
        if (block.text) {
          lines.push(block.text);
        }
      }

      return lines.join('\n');
    });

    const markdown = pageMarkdowns.filter((md) => md.length > 0).join('\n\n---\n\n');

    return {
      markdown,
      meta: {
        model: data.model,
        provider: data.provider,
      },
    };
  }
}
