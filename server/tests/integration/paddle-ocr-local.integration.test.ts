import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Integration test for PaddleOCR Local processor using a Brazilian receipt image.
 *
 * Benchmarks CPU performance with optimized threading.
 * On Apple M1: ~700ms per image with parallel execution + optimized threads.
 *
 * Requirements:
 * - ppu-paddle-ocr and onnxruntime-node must be installed
 * - The test image must exist at tests/imagem-teste.jpeg
 */

const TEST_IMAGE_PATH = path.resolve(__dirname, '..', 'imagem-teste.jpeg');

// Expected data from the Brazilian receipt
// CPU mode extracts text more accurately than CoreML
const EXPECTED_COMPANY_PARTS = ['ELETR'];
const EXPECTED_VALUE = '144,18';

interface PaddleOcrResult {
  lines: {
    text: string;
    confidence: number;
    box: number[][];
  }[][];
}

interface PaddleOcrServiceType {
  initialize(): Promise<void>;
  isInitialized(): boolean;
  recognize(image: ArrayBuffer, options?: Record<string, unknown>): Promise<PaddleOcrResult>;
  destroy(): Promise<void>;
}

/** Detect optimal thread count for CPU execution */
function detectOptimalThreads(): number {
  const totalCpus = os.cpus().length;
  // On Apple Silicon, half the cores are performance cores
  // On other architectures, use 3/4 of cores to leave headroom
  if (process.platform === 'darwin' && (os.machine?.() || process.arch) === 'arm64') {
    return Math.max(Math.floor(totalCpus / 2), 2);
  }
  return Math.max(Math.floor(totalCpus * 0.75), 2);
}

async function createPaddleOcr(): Promise<PaddleOcrServiceType> {
  const { PaddleOcrService } = await import('ppu-paddle-ocr');
  const threads = detectOptimalThreads();
  console.log(`Creating PaddleOCR with provider: cpu, threads: ${threads}, cpus: ${os.cpus().length}`);

  return new (PaddleOcrService as unknown as { new (options: unknown): PaddleOcrServiceType })({
    session: {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all',
      enableCpuMemArena: true,
      enableMemPattern: true,
      executionMode: 'parallel',
      interOpNumThreads: threads,
      intraOpNumThreads: threads,
    },
  });
}

describe('PaddleOCR Local - Brazilian Receipt Integration (cpu + optimized threads)', () => {
  let paddleOcr: PaddleOcrServiceType | null = null;
  let imageBuffer: Buffer;
  let skipTests = false;

  beforeAll(async () => {
    // Skip if test image doesn't exist
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      console.warn(`Test image not found at ${TEST_IMAGE_PATH}, skipping...`);
      skipTests = true;
      return;
    }

    imageBuffer = fs.readFileSync(TEST_IMAGE_PATH);

    // Try to load PaddleOCR - skip test gracefully if not available
    try {
      paddleOcr = await createPaddleOcr();

      console.log('Initializing PaddleOCR engine...');
      await paddleOcr.initialize();
      console.log('PaddleOCR initialized successfully.');
    } catch (error) {
      console.warn('PaddleOCR not available, skipping integration test:', error);
      skipTests = true;
    }
  }, 120_000); // 2 minute timeout for model loading

  afterAll(async () => {
    if (paddleOcr) {
      try {
        await paddleOcr.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('should have the test image available', () => {
    expect(fs.existsSync(TEST_IMAGE_PATH)).toBe(true);
  });

  it('should initialize PaddleOCR successfully', () => {
    if (skipTests || !paddleOcr) return;
    expect(paddleOcr.isInitialized()).toBe(true);
  });

  it('should extract text from the Brazilian receipt image', async () => {
    if (skipTests || !paddleOcr?.isInitialized()) return;

    const arrayBuffer = imageBuffer.buffer.slice(imageBuffer.byteOffset, imageBuffer.byteOffset + imageBuffer.byteLength) as ArrayBuffer;

    const start = performance.now();
    const results = await paddleOcr.recognize(arrayBuffer);
    const elapsed = (performance.now() - start).toFixed(0);
    console.log(`⏱️ OCR inference time (cpu, parallel, ${detectOptimalThreads()} threads): ${elapsed}ms`);

    // Collect all text from results
    const allText: string[] = [];
    if (Array.isArray(results.lines)) {
      for (const line of results.lines) {
        if (Array.isArray(line)) {
          for (const item of line) {
            if (item.text) {
              allText.push(item.text);
            }
          }
        }
      }
    }

    const fullText = allText.join('\n');
    console.log('=== PaddleOCR Extracted Text ===');
    console.log(fullText);
    console.log('================================');

    // Should have extracted some text
    expect(allText.length).toBeGreaterThan(0);

    // Validate company name (with flexibility for OCR variations)
    const upperText = fullText.toUpperCase();
    const companyMatch = EXPECTED_COMPANY_PARTS.every((part) => upperText.includes(part));
    if (!companyMatch) {
      console.warn('Company name not fully matched. Extracted text:', upperText);
    }
    expect(companyMatch).toBe(true);

    // Validate total value
    const valueMatch = fullText.includes(EXPECTED_VALUE) || fullText.includes('144.18');
    if (!valueMatch) {
      console.warn(`Value not matched. Looking for "${EXPECTED_VALUE}" in:`, fullText);
    }
    expect(valueMatch).toBe(true);
  }, 60_000);

  it('should return results with confidence scores', async () => {
    if (skipTests || !paddleOcr?.isInitialized()) return;

    const arrayBuffer = imageBuffer.buffer.slice(imageBuffer.byteOffset, imageBuffer.byteOffset + imageBuffer.byteLength) as ArrayBuffer;

    const results = await paddleOcr.recognize(arrayBuffer);

    if (Array.isArray(results.lines)) {
      for (const line of results.lines) {
        if (Array.isArray(line)) {
          for (const item of line) {
            expect(item).toHaveProperty('text');
            expect(item).toHaveProperty('confidence');
            expect(typeof item.confidence).toBe('number');
            expect(item.confidence).toBeGreaterThanOrEqual(0);
            expect(item.confidence).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  }, 60_000);

  it('should benchmark OCR performance (3 runs)', async () => {
    if (skipTests || !paddleOcr?.isInitialized()) return;

    const arrayBuffer = imageBuffer.buffer.slice(imageBuffer.byteOffset, imageBuffer.byteOffset + imageBuffer.byteLength) as ArrayBuffer;

    const times: number[] = [];
    for (let i = 0; i < 3; i++) {
      const start = performance.now();
      await paddleOcr.recognize(arrayBuffer);
      times.push(performance.now() - start);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`⏱️ Benchmark (cpu) - Run times: ${times.map((t) => t.toFixed(0) + 'ms').join(', ')} | Avg: ${avg.toFixed(0)}ms`);

    // Should complete in reasonable time
    expect(avg).toBeLessThan(30_000); // 30 seconds max
  }, 120_000);
});
