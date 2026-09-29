import { MIN_IMAGE_DIMENSION } from '../../shared/index.js';
import type { RejectionReason } from '../../shared/index.js';
import type { PipelineContext } from '../types.js';

export function validateResolution(ctx: PipelineContext): RejectionReason | null {
  if (!ctx.width || !ctx.height) {
    return 'RESOLUTION_TOO_LOW';
  }
  if (ctx.width < MIN_IMAGE_DIMENSION || ctx.height < MIN_IMAGE_DIMENSION) {
    return 'RESOLUTION_TOO_LOW';
  }
  return null;
}
