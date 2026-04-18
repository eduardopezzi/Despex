import { ParsedOcrOutput, OcrOutputParser } from './ocr-output-parser.interface';

interface GrokOcrResponse {
  markdown: string;
  model: string;
}

export class GrokParser implements OcrOutputParser {
  parse(rawJson: unknown): ParsedOcrOutput {
    const data = rawJson as GrokOcrResponse;
    return {
      markdown: data?.markdown ?? '',
      meta: { model: data?.model },
    };
  }
}
