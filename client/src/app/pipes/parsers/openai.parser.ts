import { ParsedOcrOutput, OcrOutputParser } from './ocr-output-parser.interface';

interface OpenAiOcrResponse {
  markdown: string;
  model: string;
}

export class OpenAiParser implements OcrOutputParser {
  parse(rawJson: unknown): ParsedOcrOutput {
    const data = rawJson as OpenAiOcrResponse;
    return {
      markdown: data?.markdown ?? '',
      meta: { model: data?.model },
    };
  }
}
