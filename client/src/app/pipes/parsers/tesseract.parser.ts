import { ParsedOcrOutput, OcrOutputParser } from './ocr-output-parser.interface';

interface TesseractOcrResponse {
  text: string;
  language: string;
  confidence: number;
}

export class TesseractParser implements OcrOutputParser {
  parse(rawJson: unknown): ParsedOcrOutput {
    const data = rawJson as TesseractOcrResponse;
    return {
      markdown: data?.text ?? '',
      meta: {
        language: data?.language,
        confidence: data?.confidence,
      },
    };
  }
}
