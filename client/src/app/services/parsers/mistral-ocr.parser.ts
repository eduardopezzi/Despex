import { ParsedOcrOutput, OcrOutputParser } from './ocr-output-parser.interface';

interface MistralPage {
  index: number;
  markdown: string;
  tables?: { id: string; content: string; format: string }[];
}

interface MistralOcrResponse {
  pages: MistralPage[];
  model: string;
  usageInfo?: { pagesProcessed: number; docSizeBytes: number };
}

export class MistralOcrParser implements OcrOutputParser {
  parse(rawJson: unknown): ParsedOcrOutput {
    const data = rawJson as MistralOcrResponse;
    if (!data?.pages?.length) {
      return { markdown: '' };
    }
    const pageMarkdowns = data.pages.map((page) => {
      let md = page.markdown ?? '';
      if (page.tables?.length) {
        for (const table of page.tables) {
          const ref = `[${table.id}](${table.id})`;
          md = md.replace(ref, '\n\n' + table.content + '\n\n');
        }
      }
      return md;
    });
    const markdown = pageMarkdowns.join('\n\n---\n\n');
    return {
      markdown,
      meta: {
        model: data.model,
        pagesProcessed: data.usageInfo?.pagesProcessed,
        docSizeBytes: data.usageInfo?.docSizeBytes,
      },
    };
  }
}

