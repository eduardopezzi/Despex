import { ParsedOcrOutput, OcrOutputParser } from './ocr-output-parser.interface';

export class RawJsonParser implements OcrOutputParser {
  parse(rawJson: unknown): ParsedOcrOutput {
    return {
      markdown: '```json\n' + JSON.stringify(rawJson, null, 2) + '\n```',
    };
  }
}
