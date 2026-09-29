import sharp from 'sharp';
import type { RejectionReason } from '../shared/index.js';
import { JOB_MAX_ATTEMPTS } from '../shared/index.js';
import type { Image } from '@prisma/client';
import { logger } from '../lib/logger.js';
import { deleteObjects, getObjectBuffer, putObject } from '../lib/storage.js';
import { ImagesRepository } from '../modules/images/images.repository.js';
import { UploadsRepository } from '../modules/uploads/uploads.repository.js';
import { convertHeicToJpeg, isHeicMime } from './convert-heic.js';
import { computeDHash } from './hash.js';
import type { PipelineContext, Validator } from './types.js';
import { validateBlur } from './validators/blur.js';
import { validateFace } from './validators/face.js';
import { validateFileSize } from './validators/file-size.js';
import { validateFormat } from './validators/format.js';
import { validateResolution } from './validators/resolution.js';
import { validateSimilarity } from './validators/similarity.js';

const images = new ImagesRepository();
const uploads = new UploadsRepository();

const validators: Validator[] = [
  validateFormat,
  validateFileSize,
];

export async function processImageJob(jobId: string, image: Image): Promise<void> {
  const ctx: PipelineContext = {
    image,
    buffer: await getObjectBuffer(image.storageKey),
    mimeType: image.mimeType,
    width: null,
    height: null,
    blurScore: null,
    faceCount: null,
    largestFaceRatio: null,
    perceptualHash: null,
  };

  try {
    for (const validator of validators) {
      const reason = await validator(ctx);
      if (reason) {
        await reject(image, ctx, [reason]);
        await uploads.markSucceeded(jobId);
        return;
      }
    }

    if (isHeicMime(ctx.mimeType)) {
      ctx.buffer = await convertHeicToJpeg(ctx.buffer);
      ctx.mimeType = 'image/jpeg';
      await putObject(image.storageKey, ctx.buffer, 'image/jpeg');
    }

    const meta = await sharp(ctx.buffer).metadata();
    ctx.width = meta.width ?? null;
    ctx.height = meta.height ?? null;

    const resolutionReason = validateResolution(ctx);
    if (resolutionReason) {
      await reject(image, ctx, [resolutionReason]);
      await uploads.markSucceeded(jobId);
      return;
    }

    ctx.perceptualHash = await computeDHash(ctx.buffer);
    await images.updateProcessingResult(image.id, {
      perceptualHash: ctx.perceptualHash,
      width: ctx.width,
      height: ctx.height,
      mimeType: ctx.mimeType,
    });

    const rest: Validator[] = [
      validateBlur,
      validateFace,
      validateSimilarity,
    ];
    for (const validator of rest) {
      const reason = await validator(ctx);
      if (reason) {
        await reject(image, ctx, [reason]);
        await uploads.markSucceeded(jobId);
        return;
      }
    }

    const thumbnailKey = image.storageKey.replace(/\/original$/, '/thumb');
    const thumb = await sharp(ctx.buffer)
      .resize({ width: 480, height: 480, fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();
    await putObject(thumbnailKey, thumb, 'image/jpeg');

    await images.updateProcessingResult(image.id, {
      status: 'ACCEPTED',
      width: ctx.width,
      height: ctx.height,
      mimeType: ctx.mimeType,
      perceptualHash: ctx.perceptualHash,
      blurScore: ctx.blurScore,
      faceCount: ctx.faceCount,
      largestFaceRatio: ctx.largestFaceRatio,
      thumbnailKey,
      processedAt: new Date(),
      rejectionReasons: [],
    });
    await uploads.markSucceeded(jobId);
  } catch (error) {
    logger.error({ err: error, imageId: image.id }, 'Image processing failed');
    const job = await uploads.findJobByImageId(image.id);
    const attempts = job?.attempts ?? 1;
    const retry = attempts < JOB_MAX_ATTEMPTS;
    await uploads.markFailed(
      jobId,
      error instanceof Error ? error.message : 'Unknown error',
      retry,
    );
    if (!retry) {
      await deleteFailedUpload(image);
    }
  }
}

export async function recoverOrphanedJobs(): Promise<void> {
  const orphaned = await uploads.listOrphanedJobs();
  for (const job of orphaned) {
    logger.warn(
      { imageId: job.imageId, jobId: job.id, attempts: job.attempts },
      'Recovering orphaned processing job',
    );
    if (job.status !== 'FAILED') {
      await uploads.markFailed(job.id, 'Processing stalled', false);
    }
    await deleteFailedUpload(job.image);
  }
}

async function deleteFailedUpload(image: Image): Promise<void> {
  await deleteObjects([image.storageKey, image.thumbnailKey]);
  try {
    await images.deleteById(image.id);
  } catch {
    // Already removed by a concurrent request.
  }
}

async function rejectedPreviewKey(
  image: Image,
  ctx: PipelineContext,
): Promise<string | null> {
  const thumbnailKey = image.storageKey.replace(/\/original$/, '/thumb');
  try {
    const thumb = await sharp(ctx.buffer)
      .resize({ width: 480, height: 480, fit: 'inside' })
      .jpeg({ quality: 80 })
      .toBuffer();
    await putObject(thumbnailKey, thumb, 'image/jpeg');
    return thumbnailKey;
  } catch {
    return image.thumbnailKey;
  }
}

async function reject(
  image: Image,
  ctx: PipelineContext,
  reasons: RejectionReason[],
): Promise<void> {
  const thumbnailKey = await rejectedPreviewKey(image, ctx);

  await images.updateProcessingResult(image.id, {
    status: 'REJECTED',
    width: ctx.width,
    height: ctx.height,
    mimeType: ctx.mimeType,
    perceptualHash: ctx.perceptualHash,
    blurScore: ctx.blurScore,
    faceCount: ctx.faceCount,
    largestFaceRatio: ctx.largestFaceRatio,
    thumbnailKey,
    processedAt: new Date(),
    rejectionReasons: reasons,
  });
}
