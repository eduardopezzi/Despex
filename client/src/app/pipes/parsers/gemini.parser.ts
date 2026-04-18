import { ParsedOcrOutput, OcrOutputParser } from './ocr-output-parser.interface';

interface GeminiOcrResponse {
  markdown: string;
  model: string;
}

export class GeminiParser implements OcrOutputParser {
  parse(rawJson: unknown): ParsedOcrOutput {
    const data = rawJson as GeminiOcrResponse;
    return {
      markdown: data?.markdown ?? '',
      meta: { model: data?.model },
    };
  }
}
