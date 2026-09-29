import type { Image } from '@prisma/client';
import {
  JOB_ABANDON_MS,
  JOB_STALE_LOCK_MS,
  type ImageDto,
  rejectionMessage,
} from '../../shared/index.js';
import { deleteObjects, presignGetUrl } from '../../lib/storage.js';
import { notFound } from '../../types/app-error.js';
import { UploadsRepository } from '../uploads/uploads.repository.js';
import { ImagesRepository, remainingFromCounts } from './images.repository.js';

export class ImagesService {
  constructor(
    private readonly images = new ImagesRepository(),
    private readonly uploads = new UploadsRepository(),
  ) {}

  async list(input: {
    userId: string;
    status?: Image['status'];
    cursor?: string;
    limit?: number;
  }): Promise<ImageDto[]> {
    const rows = await this.images.listForUser({
      userId: input.userId,
      status: input.status,
      cursor: input.cursor,
      limit: input.limit ?? 50,
    });
    const kept = await this.discardAbandoned(rows);
    return Promise.all(kept.map((row) => this.toDto(row)));
  }

  async get(userId: string, id: string): Promise<ImageDto> {
    const image = await this.images.findByIdForUser(id, userId);
    if (!image) {
      throw notFound('Image not found');
    }
    const kept = await this.discardAbandoned([image]);
    if (!kept[0]) {
      throw notFound('Image not found');
    }
    return this.toDto(kept[0]);
  }

  async quota(userId: string) {
    const { accepted, processing } = await this.images.countQuota(userId);
    return {
      accepted,
      processing,
      remaining: remainingFromCounts(accepted, processing),
    };
  }

  async deleteOne(userId: string, id: string): Promise<void> {
    const image = await this.images.findByIdForUser(id, userId);
    if (!image) {
      throw notFound('Image not found');
    }
    await this.uploads.failJobsForImages([image.id]);
    await deleteObjects([image.storageKey, image.thumbnailKey]);
    await this.images.deleteById(image.id);
  }

  private async discardAbandoned(rows: Image[]): Promise<Image[]> {
    const pendingBefore = Date.now() - JOB_STALE_LOCK_MS;
    const processingBefore = Date.now() - JOB_ABANDON_MS;
    const kept: Image[] = [];
    for (const image of rows) {
      const abandoned =
        (image.status === 'PENDING' &&
          image.createdAt.getTime() < pendingBefore) ||
        (image.status === 'PROCESSING' &&
          image.createdAt.getTime() < processingBefore);
      if (!abandoned) {
        kept.push(image);
        continue;
      }
      await this.uploads.failJobsForImages([image.id]);
      await deleteObjects([image.storageKey, image.thumbnailKey]);
      try {
        await this.images.deleteById(image.id);
      } catch {
        // Already removed by a concurrent request.
      }
    }
    return kept;
  }

  async toDto(image: Image): Promise<ImageDto> {
    const previewKey =
      image.thumbnailKey ??
      (image.status === 'ACCEPTED' || image.status === 'REJECTED'
        ? image.storageKey
        : null);
    let previewUrl: string | null = null;
    if (previewKey) {
      try {
        previewUrl = await presignGetUrl(previewKey);
      } catch {
        previewUrl = null;
      }
    }
    const firstReason = image.rejectionReasons[0];
    return {
      id: image.id,
      status: image.status,
      originalName: image.originalName,
      mimeType: image.mimeType,
      sizeBytes: image.sizeBytes,
      width: image.width,
      height: image.height,
      previewUrl,
      rejectionReasons: image.rejectionReasons,
      rejectionMessage: firstReason ? rejectionMessage(firstReason) : null,
      createdAt: image.createdAt.toISOString(),
      processedAt: image.processedAt?.toISOString() ?? null,
      batchId: image.batchId,
    };
  }
}
