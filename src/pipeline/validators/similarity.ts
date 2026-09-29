import { PHASH_HAMMING_THRESHOLD } from '../../shared/index.js';
import type { RejectionReason } from '../../shared/index.js';
import { ImagesRepository } from '../../modules/images/images.repository.js';
import { hammingDistance } from '../hash.js';
import type { PipelineContext } from '../types.js';

const images = new ImagesRepository();

export async function validateSimilarity(
  ctx: PipelineContext,
): Promise<RejectionReason | null> {
  if (!ctx.perceptualHash) {
    return null;
  }

  const [accepted, batch] = await Promise.all([
    images.listAcceptedHashes(ctx.image.userId),
    ctx.image.batchId
      ? images.listBatchHashes(ctx.image.userId, ctx.image.batchId)
      : Promise.resolve([]),
  ]);

  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const row of accepted) {
    if (row.id === ctx.image.id || !row.perceptualHash) {
      continue;
    }
    if (!seen.has(row.perceptualHash)) {
      seen.add(row.perceptualHash);
      candidates.push(row.perceptualHash);
    }
  }

  for (const row of batch) {
    if (row.id === ctx.image.id || !row.perceptualHash) {
      continue;
    }
    if (!seen.has(row.perceptualHash)) {
      seen.add(row.perceptualHash);
      candidates.push(row.perceptualHash);
    }
  }

  for (const hash of candidates) {
    if (hammingDistance(ctx.perceptualHash, hash) <= PHASH_HAMMING_THRESHOLD) {
      return 'TOO_SIMILAR';
    }
  }
  return null;
}
