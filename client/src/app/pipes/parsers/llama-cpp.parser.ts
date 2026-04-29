import { ParsedOcrOutput, OcrOutputParser } from './ocr-output-parser.interface';

interface LlamaCppOcrResponse {
  markdown: string;
  model: string;
}

export class LlamaCppParser implements OcrOutputParser {
  parse(rawJson: unknown): ParsedOcrOutput {
    const data = rawJson as LlamaCppOcrResponse;
    return {
      markdown: data?.markdown ?? '',
      meta: { model: data?.model },
    };
  }
}
