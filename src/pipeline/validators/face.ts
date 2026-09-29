import { MIN_FACE_RATIO } from '../../shared/index.js';
import type { RejectionReason } from '../../shared/index.js';
import { detectFaces } from '../face-detector.js';
import type { PipelineContext } from '../types.js';

export async function validateFace(
  ctx: PipelineContext,
): Promise<RejectionReason | null> {
  const result = await detectFaces(ctx.buffer);
  ctx.faceCount = result.faceCount;
  ctx.largestFaceRatio = result.largestFaceRatio;

  if (result.faceCount === 0) {
    return 'NO_FACE';
  }
  if (result.faceCount > 1) {
    return 'MULTIPLE_FACES';
  }
  if (result.largestFaceRatio < MIN_FACE_RATIO) {
    return 'FACE_TOO_SMALL';
  }
  return null;
}
