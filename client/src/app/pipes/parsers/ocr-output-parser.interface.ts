export interface ParsedOcrOutput {
  markdown: string;
  meta?: Record<string, unknown>;
}

export interface OcrOutputParser {
  parse(rawJson: unknown): ParsedOcrOutput;
}

