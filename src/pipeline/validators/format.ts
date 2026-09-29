import { fileTypeFromBuffer } from 'file-type';
import type { RejectionReason } from '../../shared/index.js';
import type { PipelineContext } from '../types.js';

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47];

function startsWith(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) {
    return false;
  }
  return signature.every((byte, index) => buffer[index] === byte);
}

function isHeicContainer(buffer: Buffer): boolean {
  if (buffer.length < 12) {
    return false;
  }
  const brand = buffer.subarray(4, 8).toString('ascii');
  if (brand !== 'ftyp') {
    return false;
  }
  const type = buffer.subarray(8, 12).toString('ascii').toLowerCase();
  return ['heic', 'heif', 'mif1', 'msf1', 'heix', 'hevc'].includes(type);
}

export async function validateFormat(
  ctx: PipelineContext,
): Promise<RejectionReason | null> {
  const detected = await fileTypeFromBuffer(ctx.buffer);
  const mime = detected?.mime;

  if (mime === 'image/jpeg' || mime === 'image/png') {
    ctx.mimeType = mime;
    return null;
  }
  if (mime === 'image/heic' || mime === 'image/heif' || isHeicContainer(ctx.buffer)) {
    ctx.mimeType = mime ?? 'image/heic';
    return null;
  }
  if (!detected && (startsWith(ctx.buffer, JPEG) || startsWith(ctx.buffer, PNG))) {
    ctx.mimeType = startsWith(ctx.buffer, JPEG) ? 'image/jpeg' : 'image/png';
    return null;
  }
  return 'INVALID_FORMAT';
}
