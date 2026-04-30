import { Inject, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { extname } from 'path';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { FileExtension } from '@open-receipt-ocr/types';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';
import { getMimeType } from '@worker/ocr/utils/mime-type.util';
import { streamToBase64 } from '@worker/ocr/utils/stream.util';

const OPENAI_MODEL = 'gpt-4o';

const OCR_PROMPT = [
  'You are an OCR engine. Transcribe every piece of text visible in the provided document into clean, well-structured GitHub-flavored Markdown.',
  'Preserve the original reading order and layout. Reproduce tables as Markdown tables. Keep totals, dates, item lists, and line-item quantities/prices intact.',
  'Do not add commentary, explanations, or wrap the output in code fences. Return only the transcribed Markdown.',
].join(' ');

@Injectable()
export class OpenAiProcessor {
  private readonly logger = new Logger(OpenAiProcessor.name);

  constructor(
    @Inject(SecretProvider) private readonly secretProvider: SecretProvider,
    private readonly storage: StorageProvider,
  ) {}

  async process(file: OcrFileEntity, executionId: number): Promise<string> {
    const apiKey = await this.secretProvider.getSecretOrThrow(AppSecret.OpenAiApiKey);
    const client = new OpenAI({ apiKey });

    const fileStream = await this.storage.getStream(file.filename);
    const base64Content = await streamToBase64(fileStream);
    const mimeType = getMimeType(extname(file.originalName).toLowerCase() as FileExtension);

    this.logger.log(`Calling OpenAI (${OPENAI_MODEL}) for execution #${executionId}`);

    const response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Content}` } },
            { type: 'text', text: OCR_PROMPT },
          ],
        },
      ],
    });

    const markdown = response.choices[0]?.message?.content ?? '';

    return JSON.stringify({ markdown, model: OPENAI_MODEL });
  }
}
