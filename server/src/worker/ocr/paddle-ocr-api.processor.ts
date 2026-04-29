import { Inject, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as path from 'node:path';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';

interface PaddleOcrApiResponse {
  errorCode: number;
  errorMsg: string;
  result: {
    layoutParsingResults?: Array<{
      markdown: {
        text: string;
      };
    }>;
    ocrResults?: Array<{
      prunedResult: {
        rec_texts: string[];
        rec_scores: number[];
        rec_boxes: unknown[];
      };
    }>;
  };
}

@Injectable()
export class PaddleOcrApiProcessor {
  private readonly logger = new Logger(PaddleOcrApiProcessor.name);

  constructor(
    @Inject(SecretProvider) private readonly secretProvider: SecretProvider,
    private readonly storage: StorageProvider,
  ) {}

  async process(file: OcrFileEntity, executionId: number): Promise<string> {
    const apiKey = await this.secretProvider.getSecretOrThrow(AppSecret.PaddleOcrApiKey);
    const endpoint = await this.secretProvider.getSecretOrThrow(AppSecret.PaddleOcrEndpoint);

    const fileStream = await this.storage.getStream(file.filename);
    const fileBuffer = await this.streamToBuffer(fileStream);
    const base64Content = fileBuffer.toString('base64');

    const extension = path.extname(file.filename).toLowerCase();
    const fileType = extension === '.pdf' ? 0 : 1;

    this.logger.log(`Calling PaddleOCR API for execution #${executionId} (type: ${fileType})`);

    try {
      const response = await axios.post(
        endpoint,
        {
          file: base64Content,
          fileType,
          useDocOrientationClassify: false,
          useDocUnwarping: false,
          useChartRecognition: false,
        },
        {
          headers: {
            Authorization: `token ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 second timeout
        },
      );

      const data = response.data as PaddleOcrApiResponse;

      if (!data || data.errorCode !== 0) {
        throw new Error(`PaddleOCR API returned an error: ${data?.errorMsg || JSON.stringify(data)} (code: ${data?.errorCode})`);
      }

      const ocrResults = data.result?.ocrResults;
      const layoutParsingResults = data.result?.layoutParsingResults;

      let pages: unknown[] = [];

      if (ocrResults && Array.isArray(ocrResults) && ocrResults.length > 0) {
        pages = ocrResults.map((res) => ({
          blocks: res.prunedResult.rec_texts
            .map((text, i) => ({
              text: text || '',
              confidence: res.prunedResult.rec_scores[i] || 0,
              bbox: res.prunedResult.rec_boxes[i] || null,
            }))
            .filter((block) => block.text.trim().length > 0),
        }));
      } else if (layoutParsingResults && Array.isArray(layoutParsingResults) && layoutParsingResults.length > 0) {
        pages = layoutParsingResults.map((res) => ({
          blocks: [
            {
              text: res.markdown?.text || '',
              confidence: 1,
              bbox: null,
            },
          ],
        }));
      } else {
        throw new Error('PaddleOCR API returned success but missing recognized content');
      }

      // Map to the format expected by the client parser (PaddleOcrApiParser)
      const formatted = { pages };

      return JSON.stringify(formatted);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as Record<string, unknown> | undefined;
        const errorMessage = (responseData?.errorMsg as string) || (responseData?.error as string) || error.message;
        const errorCode = responseData?.errorCode;
        throw new Error(`PaddleOCR API error: ${errorMessage}${errorCode ? ` (code: ${errorCode as string})` : ''}`);
      }
      this.logger.error(error);
      throw error;
    }
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
