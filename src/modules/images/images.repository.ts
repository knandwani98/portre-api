import type { Image, ImageStatus, Prisma, RejectionReason } from '@prisma/client';
import { MAX_ACCEPTED_PHOTOS } from '../../shared/index.js';
import { prisma } from '../../lib/prisma.js';

export type ImageCreateInput = {
  id: string;
  userId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  batchId: string;
};

export class ImagesRepository {
  findByIdForUser(id: string, userId: string): Promise<Image | null> {
    return prisma.image.findFirst({
      where: { id, userId },
    });
  }

  listForUser(input: {
    userId: string;
    status?: ImageStatus;
    cursor?: string;
    limit: number;
  }): Promise<Image[]> {
    return prisma.image.findMany({
      where: {
        userId: input.userId,
        ...(input.status ? { status: input.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: input.limit,
      ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    });
  }

  countQuota(userId: string): Promise<{ accepted: number; processing: number }> {
    return prisma.$transaction(async (tx) => {
      const [accepted, processing] = await Promise.all([
        tx.image.count({
          where: { userId, status: 'ACCEPTED' },
        }),
        tx.image.count({
          where: { userId, status: { in: ['PENDING', 'PROCESSING'] } },
        }),
      ]);
      return { accepted, processing };
    });
  }

  async reserveSlot(
    userId: string,
    create: ImageCreateInput,
  ): Promise<
    | { ok: true; image: Image; remaining: number }
    | { ok: false; remaining: 0 }
  > {
    return prisma.$transaction(async (tx) => {
      const [accepted, processing] = await Promise.all([
        tx.image.count({ where: { userId, status: 'ACCEPTED' } }),
        tx.image.count({
          where: { userId, status: { in: ['PENDING', 'PROCESSING'] } },
        }),
      ]);
      const remaining = MAX_ACCEPTED_PHOTOS - accepted - processing;
      if (remaining <= 0) {
        return { ok: false, remaining: 0 };
      }
      const image = await tx.image.create({
        data: {
          id: create.id,
          userId: create.userId,
          originalName: create.originalName,
          mimeType: create.mimeType,
          sizeBytes: create.sizeBytes,
          storageKey: create.storageKey,
          batchId: create.batchId,
          status: 'PENDING',
        },
      });
      return { ok: true, image, remaining: remaining - 1 };
    });
  }

  markProcessing(id: string): Promise<Image> {
    return prisma.image.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });
  }

  updateProcessingResult(
    id: string,
    data: Prisma.ImageUpdateInput,
  ): Promise<Image> {
    return prisma.image.update({
      where: { id },
      data,
    });
  }

  deleteById(id: string): Promise<Image> {
    return prisma.image.delete({
      where: { id },
    });
  }

  listAcceptedHashes(userId: string): Promise<Array<{ id: string; perceptualHash: string | null; batchId: string | null; createdAt: Date }>> {
    return prisma.image.findMany({
      where: {
        userId,
        status: 'ACCEPTED',
        perceptualHash: { not: null },
      },
      select: {
        id: true,
        perceptualHash: true,
        batchId: true,
        createdAt: true,
      },
    });
  }

  listBatchHashes(userId: string, batchId: string): Promise<Array<{ id: string; perceptualHash: string | null }>> {
    return prisma.image.findMany({
      where: {
        userId,
        batchId,
        perceptualHash: { not: null },
      },
      select: { id: true, perceptualHash: true },
    });
  }
}

export function remainingFromCounts(accepted: number, processing: number): number {
  return Math.max(0, MAX_ACCEPTED_PHOTOS - accepted - processing);
}

export type { RejectionReason };
