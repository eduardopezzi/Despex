import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AppSecret } from '@core/types/app-secret.enum';
import { SecretProvider } from '@core/secrets/secret-provider.interface';
import { StorageProvider } from '@core/storage/storage-provider.interface';
import { OcrFileEntity } from '@core/database/entities/ocr-file.entity';
import * as os from 'os';
import { createRequire } from 'module';
import { deflateSync } from 'zlib';
import jsQR from 'jsqr';

/** Native PaddleOCR result structure (isolated from library types) */
interface PaddleOcrResult {
  lines: {
    text: string;
    confidence: number;
    box: number[][];
  }[][];
}

/** Local interface for the PaddleOCR service to avoid static imports and maintain strict typing */
interface PaddleOcrServiceType {
  initialize(): Promise<void>;
  isInitialized(): boolean;
  recognize(image: ArrayBuffer, options?: Record<string, unknown>): Promise<PaddleOcrResult>;
  destroy(): Promise<void>;
}

interface SharpInstance {
  metadata(): Promise<{ width?: number; height?: number }>;
  rotate(): SharpInstance;
  grayscale(): SharpInstance;
  ensureAlpha(): SharpInstance;
  normalize(): SharpInstance;
  sharpen(): SharpInstance;
  resize(width: number, height: number, options: { fit: string; withoutEnlargement: boolean }): SharpInstance;
  png(): { toBuffer(): Promise<Buffer> };
  raw(): { toBuffer(options: { resolveWithObject: true }): Promise<{ data: Buffer; info: { width: number; height: number } }> };
}

type SharpFactory = (input: Buffer) => SharpInstance;
type SharpModule = SharpFactory | { default: SharpFactory };

const requireOptional = createRequire(__filename) as (id: string) => unknown;

/**
 * Detects the best execution provider for the current platform.
 * CPU is generally faster and more reliable for PaddleOCR models because:
 * - CoreML doesn't support all ONNX operators (causes expensive fallbacks)
 * - CUDA may not be available
 * CPU with optimized threading on Apple M1 is very fast (~700ms per image).
 */
function detectBestExecutionProvider(): string {
  // CPU is the best default for PaddleOCR on all platforms
  return 'cpu';
}

/**
 * Detects optimal thread count based on available CPU cores.
 * Uses performance cores (half of total on big.LITTLE architectures like M1).
 */
function detectOptimalThreads(): number {
  const totalCpus = os.cpus().length;
  // On Apple Silicon, half the cores are performance cores
  // On other architectures, use 3/4 of cores to leave headroom
  if (process.platform === 'darwin' && (os.machine?.() || process.arch) === 'arm64') {
    return Math.max(Math.floor(totalCpus / 2), 2);
  }
  return Math.max(Math.floor(totalCpus * 0.75), 2);
}

@Injectable()
export class PaddleOcrLocalProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaddleOcrLocalProcessor.name);

  private paddleOcr: PaddleOcrServiceType | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor(
    @Inject(SecretProvider) private readonly secretProvider: SecretProvider,
    private readonly storage: StorageProvider,
  ) {}

  async onModuleInit() {
    await this.ensureInitialized(undefined, true);
  }

  async onModuleDestroy() {
    if (this.paddleOcr) {
      this.logger.log('Destroying PaddleOCR sessions...');
      await this.paddleOcr.destroy();
    }
  }

  private async ensureInitialized(executionId?: number, isBackground = false): Promise<void> {
    const enabled = await this.secretProvider.getSecret(AppSecret.PaddleOcrLocalEnabled);
    if (enabled?.toLowerCase() !== 'true') {
      if (isBackground) return;
      throw new Error('PaddleOCR local is not enabled. Set PADDLE_OCR_LOCAL_ENABLED=true');
    }

    if (!this.paddleOcr) {
      this.logger.log('Loading PaddleOCR local engine...');
      try {
        const { PaddleOcrService } = await import('ppu-paddle-ocr');

        // Determine execution provider from config or auto-detect
        const configProvider = await this.secretProvider.getSecret(AppSecret.PaddleOcrExecutionProvider);
        const executionProvider = configProvider || detectBestExecutionProvider();
        const optimalThreads = detectOptimalThreads();

        this.logger.log(`Execution provider: ${executionProvider} | Threads: ${optimalThreads} | CPUs: ${os.cpus().length}`);

        this.paddleOcr = new (PaddleOcrService as unknown as { new (options: unknown): PaddleOcrServiceType })({
          session: {
            executionProviders: [executionProvider],
            graphOptimizationLevel: 'all',
            enableCpuMemArena: true,
            enableMemPattern: true,
            executionMode: 'parallel',
            interOpNumThreads: optimalThreads,
            intraOpNumThreads: optimalThreads,
          },
        });
      } catch {
        this.logger.error('Could not load ppu-paddle-ocr. Is it installed?');
        throw new Error(
          'Local PaddleOCR library is missing. Please install it with "npm install ppu-paddle-ocr onnxruntime-node" inside the container.',
        );
      }
    }

    if (!this.paddleOcr.isInitialized()) {
      let isAlreadyInitializing = true;

      if (!this.initializationPromise) {
        isAlreadyInitializing = false;

        if (isBackground) {
          this.logger.log('Starting PaddleOCR background initialization...');
        } else if (executionId !== undefined) {
          this.logger.log(`Initializing PaddleOCR for execution #${executionId}...`);
        }

        this.initializationPromise = this.paddleOcr
          .initialize()
          .then(async () => {
            this.initializationPromise = null;

            // Warm-up: run a dummy inference to trigger ONNX JIT compilation
            const warmupEnabled = await this.secretProvider.getSecret(AppSecret.PaddleOcrWarmupEnabled);
            if (warmupEnabled?.toLowerCase() !== 'false') {
              await this.warmUp();
            }
          })
          .catch((err: unknown) => {
            this.logger.error('Failed to initialize PaddleOCR', err);
            this.initializationPromise = null;
          });
      }

      if (!isBackground) {
        if (isAlreadyInitializing && executionId !== undefined) {
          this.logger.log(`Waiting for PaddleOCR background initialization for execution #${executionId}...`);
        }
        await this.initializationPromise;

        if (!this.paddleOcr.isInitialized()) {
          throw new Error('PaddleOCR failed to initialize properly.');
        }
      }
    }
  }

  /**
   * Warm-up: runs a small dummy inference to trigger ONNX JIT compilation
   * so the first real request isn't slow.
   */
  private async warmUp(): Promise<void> {
    if (!this.paddleOcr?.isInitialized()) return;

    try {
      this.logger.log('🔥 Warming up PaddleOCR engine...');
      const start = performance.now();

      // Create a tiny 1x1 white PNG image as ArrayBuffer
      // Minimal valid PNG: 8-byte signature + IHDR + IDAT + IEND
      const dummyImage = createMinimalPng(64, 64);
      await this.paddleOcr.recognize(dummyImage);

      const elapsed = (performance.now() - start).toFixed(0);
      this.logger.log(`🔥 Warm-up completed in ${elapsed}ms`);
    } catch {
      // Warm-up failure is non-critical
      this.logger.warn('Warm-up inference failed (non-critical)');
    }
  }

  async process(file: OcrFileEntity, executionId: number): Promise<string> {
    await this.ensureInitialized(executionId);

    const fileStream = await this.storage.getStream(file.filename);
    const fileBuffer = await this.streamToBuffer(fileStream);

    this.logger.log(`Processing with local PaddleOCR for execution #${executionId}`);

    try {
      let arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) as ArrayBuffer;
      const fiscalQrCodeUrl = await this.decodeQrCodeUrl(arrayBuffer);

      // Normalize image orientation/contrast and optionally resize large images to speed up OCR.
      const maxSizeStr = await this.secretProvider.getSecret(AppSecret.PaddleOcrMaxImageSize);
      const maxSize = maxSizeStr ? parseInt(maxSizeStr, 10) : 1280;
      arrayBuffer = await this.preprocessImage(arrayBuffer, maxSize);

      const start = performance.now();
      const results = await this.paddleOcr!.recognize(arrayBuffer);
      const elapsed = (performance.now() - start).toFixed(0);
      this.logger.log(`PaddleOCR inference for execution #${executionId} took ${elapsed}ms`);

      const formattedResults = this.formatPaddleOcrResults(results, fiscalQrCodeUrl);
      return JSON.stringify(formattedResults);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`PaddleOCR local processing failed: ${message}`);
    }
  }

  /**
   * Normalizes an image for OCR.
   * Uses sharp if installed, otherwise skips preprocessing gracefully.
   */

  private async preprocessImage(arrayBuffer: ArrayBuffer, maxSize: number): Promise<ArrayBuffer> {
    // Dynamic require to avoid TS import errors when sharp is not installed
    let sharpFn: SharpFactory | null = null;
    try {
      const sharpModule = requireOptional('sharp') as SharpModule;
      sharpFn = typeof sharpModule === 'function' ? sharpModule : sharpModule.default;
    } catch {
      this.logger.debug('sharp not available, skipping image resize');
      return arrayBuffer;
    }

    try {
      const buffer = Buffer.from(arrayBuffer);
      const metadata = await sharpFn(buffer).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      let image = sharpFn(buffer).rotate().grayscale().normalize().sharpen();

      if (maxSize > 0 && (width > maxSize || height > maxSize)) {
        this.logger.log(`Resizing image from ${width}x${height} to max ${maxSize}px`);
        image = image.resize(maxSize, maxSize, { fit: 'inside' as const, withoutEnlargement: true });
      }

      const processedBuffer = await image.png().toBuffer();
      return processedBuffer.buffer.slice(processedBuffer.byteOffset, processedBuffer.byteOffset + processedBuffer.byteLength) as ArrayBuffer;
    } catch {
      this.logger.debug('Image preprocessing failed, using original');
    }

    return arrayBuffer;
  }

  private async decodeQrCodeUrl(arrayBuffer: ArrayBuffer): Promise<string | null> {
    let sharpFn: SharpFactory | null = null;
    try {
      const sharpModule = requireOptional('sharp') as SharpModule;
      sharpFn = typeof sharpModule === 'function' ? sharpModule : sharpModule.default;
    } catch {
      this.logger.debug('sharp not available, skipping QR decode');
      return null;
    }

    try {
      const buffer = Buffer.from(arrayBuffer);
      const { data, info } = await sharpFn(buffer)
        .rotate()
        .resize(1600, 1600, { fit: 'inside' as const, withoutEnlargement: true })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const code = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), info.width, info.height);
      const value = code?.data?.trim();
      if (!value || !/^https?:\/\//i.test(value)) return null;
      this.logger.log('Fiscal QR Code detected before OCR');
      return value;
    } catch {
      this.logger.debug('QR decode failed, continuing with OCR only');
      return null;
    }
  }

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk)); // NodeJS.ReadableStream chunks can be strings or Buffers
    }
    return Buffer.concat(chunks);
  }

  private formatPaddleOcrResults(results: PaddleOcrResult, fiscalQrCodeUrl?: string | null): object {
    const textBlocks: { text: string; confidence: number; bbox: number[][] }[] = [];

    if (Array.isArray(results.lines)) {
      for (const line of results.lines) {
        if (Array.isArray(line)) {
          for (const item of line) {
            textBlocks.push({
              text: item.text || '',
              confidence: item.confidence || 0,
              bbox: item.box,
            });
          }
        }
      }
    }

    const pages = [{ blocks: textBlocks }];

    return {
      pages,
      model: 'paddle-ocr',
      provider: 'paddle-ocr-local',
      fiscalQrCodeUrl,
    };
  }
}

/**
 * Creates a minimal valid PNG image (white pixels only).
 * Used for warm-up inference.
 */
function createMinimalPng(width: number, height: number): ArrayBuffer {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT chunk (white image: filter byte 0 + RGB bytes per pixel per row)
  const rowSize = 1 + width * 3; // filter byte + RGB
  const rawData = Buffer.alloc(rowSize * height, 255); // all white
  const compressed = deflateSync(rawData);
  const idat = createChunk('IDAT', compressed);

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]).buffer.slice(
    Buffer.concat([signature, ihdr, idat, iend]).byteOffset,
    Buffer.concat([signature, ihdr, idat, iend]).byteOffset + Buffer.concat([signature, ihdr, idat, iend]).byteLength,
  );
}

function createChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuffer, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
