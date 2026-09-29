import sharp from 'sharp';
import { BLUR_VARIANCE_THRESHOLD } from '../../shared/index.js';
import type { RejectionReason } from '../../shared/index.js';
import type { PipelineContext } from '../types.js';

function laplacianVariance(
  gray: Buffer,
  width: number,
  height: number,
): number {
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const center = gray[i] ?? 0;
      const lap =
        -4 * center +
        (gray[i - 1] ?? 0) +
        (gray[i + 1] ?? 0) +
        (gray[i - width] ?? 0) +
        (gray[i + width] ?? 0);
      sum += lap;
      sumSq += lap * lap;
      count += 1;
    }
  }

  if (count === 0) {
    return 0;
  }
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

export async function validateBlur(
  ctx: PipelineContext,
): Promise<RejectionReason | null> {
  const { data, info } = await sharp(ctx.buffer)
    .greyscale()
    .resize({ width: 256, height: 256, fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const score = laplacianVariance(data, info.width, info.height);
  ctx.blurScore = score;
  if (score < BLUR_VARIANCE_THRESHOLD) {
    return 'BLURRY';
  }
  return null;
}
