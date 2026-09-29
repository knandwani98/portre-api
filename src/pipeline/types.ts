import type { RejectionReason } from '../shared/index.js';
import type { Image } from '@prisma/client';

export type PipelineContext = {
  image: Image;
  buffer: Buffer;
  mimeType: string;
  width: number | null;
  height: number | null;
  blurScore: number | null;
  faceCount: number | null;
  largestFaceRatio: number | null;
  perceptualHash: string | null;
};

export type Validator = (
  ctx: PipelineContext,
) => Promise<RejectionReason | null> | RejectionReason | null;
