import convert from 'heic-convert';

export async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  const output = await convert({
    buffer: new Uint8Array(buffer),
    format: 'JPEG',
    quality: 0.9,
  });
  return Buffer.from(output);
}

export function isHeicMime(mimeType: string): boolean {
  return mimeType === 'image/heic' || mimeType === 'image/heif';
}
