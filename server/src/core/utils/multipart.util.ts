import { BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import type { Request } from 'express';
import Busboy from 'busboy';
import { StorageProvider } from '@core/storage/storage-provider.interface';

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
        logger.error(`Settle error: ${err.message}`, err.stack);
        req.resume(); // Ensure request stream is drained if we error out early
        reject(err);
      } else if (result) {
        logger.log(`Parsing completed successfully: ${result.files.length} files, ${Object.keys(result.fields).length} fields`);
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

    let fileCount = 0;
    busboy.on('file', (fieldname, stream, info) => {
      const { filename, mimeType } = info;
      const index = fileCount++;

      try {
        if (!filename) {
          logger.warn(`No filename provided for field ${fieldname}`);
          stream.resume();
          return settle(new BadRequestException('Upload must include a filename.'));
        }

        if (!options.allowedMimeTypes.has(mimeType)) {
          logger.warn(`Unsupported MIME type: ${mimeType} for file ${filename}`);
          stream.resume();
          return settle(new BadRequestException(`Unsupported file type "${mimeType}". Allowed: ${[...options.allowedMimeTypes].join(', ')}.`));
        }

        logger.log(`Streaming upload started: ${filename} at index ${index}`);

        stream.on('limit', () => {
          logger.error(`File size limit exceeded: ${filename}`);
          stream.resume();
          settle(new BadRequestException(`File exceeds the maximum allowed size of ${options.maxSizeBytes / 1024 / 1024} MB.`));
        });

        stream.on('error', (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          logger.error(`File stream error [${filename}]: ${message}`);
          stream.resume();
          settle(new InternalServerErrorException(`File stream error: ${message}`));
        });

        const uploadPromise = storage
          .uploadStream(stream, filename, mimeType)
          .then((result) => {
            logger.log(`Streaming upload finished: ${filename} (key: ${result.key})`);
            files[index] = {
              key: result.key,
              originalName: filename,
              mimeType,
            };
          })
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`Storage upload error [${filename}]: ${message}`);
            stream.resume();
            settle(new InternalServerErrorException(`Storage error: ${message}`));
          });

        uploadPromises.push(uploadPromise);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Unexpected busboy file event error: ${message}`);
        stream.resume();
        settle(new InternalServerErrorException(`Unexpected error handling file: ${message}`));
      }
    });

    busboy.on('error', (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Busboy parse error: ${message}`);
      settle(new InternalServerErrorException(`Multipart parse error: ${message}`));
    });

    busboy.on('finish', () => {
      logger.log(`Busboy finish event received. Waiting for ${uploadPromises.length} uploads to complete...`);
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
          logger.error(`Finalizing upload failure: ${message}`);
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
