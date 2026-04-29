/**
 * Utility to convert a NodeJS ReadableStream into a Buffer.
 * Useful for handling file streams when an in-memory buffer is required (e.g., for certain OCR SDKs).
 */
export async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
