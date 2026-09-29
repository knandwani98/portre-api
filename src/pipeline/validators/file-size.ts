import { MIN_FILE_SIZE_BYTES } from '../../shared/index.js';
import type { RejectionReason } from '../../shared/index.js';
import type { PipelineContext } from '../types.js';

export function validateFileSize(ctx: PipelineContext): RejectionReason | null {
  if (ctx.buffer.length < MIN_FILE_SIZE_BYTES || ctx.image.sizeBytes < MIN_FILE_SIZE_BYTES) {
    return 'FILE_TOO_SMALL';
  }
  return null;
}
