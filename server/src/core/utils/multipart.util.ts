import { BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import type { Request } from 'express';
import Busboy from 'busboy';
import { StorageProvider } from '../storage/storage-provider.interface';

interface MultipartFileResult {
  key: string;
  originalName: string;
  mimeType: string;
}

interface ParseMultipartResult {
  file: MultipartFileResult;
  fields: Record<string, string>;
}

interface ParseMultipartOptions {
  maxSizeBytes: number;
  allowedMimeTypes: Set<string>;
}

const logger = new Logger('MultipartUtil');

export function parseMultipartStream(req: Request, storage: StorageProvider, options: ParseMultipartOptions): Promise<ParseMultipartResult> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: options.maxSizeBytes,
      },
    });

    const fields: Record<string, string> = {};
    let fileResult: MultipartFileResult | null = null;
    let fileUploaded = false;
    let uploadPromise: Promise<void> | null = null;
    let settled = false;

    const settle = (err?: Error, result?: ParseMultipartResult) => {
      if (settled) return;
      settled = true;
      req.unpipe(busboy);
      busboy.removeAllListeners();

      if (err) {
        reject(err);
      } else if (result) {
        resolve(result);
      }
    };

    busboy.on('field', (fieldname, val) => {
      try {
        fields[fieldname] = val;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        settle(new InternalServerErrorException(`Field parsing error: ${message}`));
      }
    });

    busboy.on('file', (fieldname, stream, info) => {
      const { filename, mimeType } = info;
      fileUploaded = true;

      try {
        if (!filename) {
          stream.resume(); // Ensure stream is drained to unblock further request parsing
          return settle(new BadRequestException('Upload must include a filename.'));
        }

        if (!options.allowedMimeTypes.has(mimeType)) {
          stream.resume();
          return settle(new BadRequestException(`Unsupported file type "${mimeType}". Allowed: ${[...options.allowedMimeTypes].join(', ')}.`));
        }

        logger.log(`Streaming upload: ${filename} (${mimeType})`);

        stream.on('limit', () => {
          stream.resume();
          settle(new BadRequestException(`File exceeds the maximum allowed size of ${options.maxSizeBytes / 1024 / 1024} MB.`));
        });

        stream.on('error', (err: unknown) => {
          stream.resume();
          const message = err instanceof Error ? err.message : String(err);
          settle(new InternalServerErrorException(`File stream error: ${message}`));
        });

        // Hand off stream processing to the active storage provider and store the Promise
        uploadPromise = storage
          .uploadStream(stream, filename, mimeType)
          .then((result) => {
            fileResult = {
              key: result.key,
              originalName: filename,
              mimeType,
            };
          })
          .catch((err: unknown) => {
            stream.resume();
            const message = err instanceof Error ? err.message : String(err);
            settle(new InternalServerErrorException(`Storage error: ${message}`));
          });
      } catch (err: unknown) {
        stream.resume();
        const message = err instanceof Error ? err.message : String(err);
        settle(new InternalServerErrorException(`Unexpected error handling file: ${message}`));
      }
    });

    busboy.on('error', (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      settle(new InternalServerErrorException(`Multipart parse error: ${message}`));
    });

    busboy.on('finish', () => {
      if (!fileUploaded) {
        return settle(new BadRequestException('No file field found in the multipart request.'));
      }

      // Given the file may be still completing its async persist via the storage provider,
      // wait until the stream upload Promise has completely resolved before finalizing the request.
      if (uploadPromise) {
        uploadPromise
          .then(() => {
            if (!settled && fileResult) {
              settle(undefined, { file: fileResult, fields });
            }
          })
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            settle(new InternalServerErrorException(`Failed to await upload completion: ${message}`));
          });
      }
    });

    req.on('error', (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      settle(new InternalServerErrorException(`Request stream error: ${message}`));
    });

    req.pipe(busboy);
  });
}
