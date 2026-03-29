import { BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import type { Request } from 'express';
import Busboy from 'busboy';
import { StorageProvider } from '../storage/storage-provider.interface';

interface MultipartFileResult {
  key: string;
  originalName: string;
  mimeType: string;
}

interface ParseMultipartOptions {
  maxSizeBytes: number;
  allowedMimeTypes: Set<string>;
}

const logger = new Logger('MultipartUtil');

interface ParseMultipartResult {
  files: MultipartFileResult[];
  fields: Record<string, string>;
}

export function parseMultipartStream(req: Request, storage: StorageProvider, options: ParseMultipartOptions): Promise<ParseMultipartResult> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: options.maxSizeBytes,
      },
    });

    const fields: Record<string, string> = {};
    const files: MultipartFileResult[] = [];
    const uploadPromises: Promise<void>[] = [];
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

      try {
        if (!filename) {
          stream.resume();
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

        const uploadPromise = storage
          .uploadStream(stream, filename, mimeType)
          .then((result) => {
            files.push({
              key: result.key,
              originalName: filename,
              mimeType,
            });
          })
          .catch((err: unknown) => {
            stream.resume();
            const message = err instanceof Error ? err.message : String(err);
            settle(new InternalServerErrorException(`Storage error: ${message}`));
          });

        uploadPromises.push(uploadPromise);
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
      Promise.all(uploadPromises)
        .then(() => {
          if (!settled) {
            if (files.length === 0) {
              return settle(new BadRequestException('No file field found in the multipart request.'));
            }
            settle(undefined, { files, fields });
          }
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          settle(new InternalServerErrorException(`Failed to await upload completion: ${message}`));
        });
    });

    req.on('error', (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      settle(new InternalServerErrorException(`Request stream error: ${message}`));
    });

    req.pipe(busboy);
  });
}
