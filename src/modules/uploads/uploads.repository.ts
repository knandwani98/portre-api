import type { Image, ProcessingJob } from '@prisma/client';
import { JOB_MAX_ATTEMPTS, JOB_STALE_LOCK_MS } from '../../shared/index.js';
import { prisma } from '../../lib/prisma.js';

export class UploadsRepository {
  createJob(imageId: string): Promise<ProcessingJob> {
    return prisma.processingJob.create({
      data: {
        imageId,
        status: 'QUEUED',
      },
    });
  }

  failJobsForImages(imageIds: string[]): Promise<void> {
    if (imageIds.length === 0) {
      return Promise.resolve();
    }
    return prisma.processingJob
      .updateMany({
        where: { imageId: { in: imageIds } },
        data: { status: 'FAILED', lastError: 'Cancelled by user' },
      })
      .then(() => undefined);
  }

  findJobByImageId(imageId: string): Promise<ProcessingJob | null> {
    return prisma.processingJob.findUnique({
      where: { imageId },
    });
  }

  async claimNext(): Promise<(ProcessingJob & { image: Image }) | null> {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      WITH cte AS (
        SELECT id
        FROM "ProcessingJob"
        WHERE status IN ('QUEUED', 'RUNNING')
          AND attempts < ${JOB_MAX_ATTEMPTS}
          AND "runAfter" <= NOW()
          AND (
            "lockedAt" IS NULL
            OR "lockedAt" < NOW() - INTERVAL '2 minutes'
          )
        ORDER BY "runAfter" ASC, "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE "ProcessingJob" AS j
      SET
        status = 'RUNNING',
        "lockedAt" = NOW(),
        attempts = j.attempts + 1
      FROM cte
      WHERE j.id = cte.id
      RETURNING j.id
    `;

    const claimed = rows[0];
    if (!claimed) {
      return null;
    }

    return prisma.processingJob.findUnique({
      where: { id: claimed.id },
      include: { image: true },
    });
  }

  markSucceeded(id: string): Promise<ProcessingJob> {
    return prisma.processingJob.update({
      where: { id },
      data: { status: 'SUCCEEDED', lockedAt: null, lastError: null },
    });
  }

  markFailed(id: string, lastError: string, retry: boolean): Promise<ProcessingJob> {
    return prisma.processingJob.update({
      where: { id },
      data: retry
        ? {
            status: 'QUEUED',
            lastError,
            lockedAt: null,
            runAfter: new Date(Date.now() + 15_000),
          }
        : {
            status: 'FAILED',
            lastError,
            lockedAt: null,
          },
    });
  }

  listOrphanedJobs(): Promise<Array<ProcessingJob & { image: Image }>> {
    const staleBefore = new Date(Date.now() - JOB_STALE_LOCK_MS);
    return prisma.processingJob.findMany({
      where: {
        image: { status: { in: ['PENDING', 'PROCESSING'] } },
        OR: [
          {
            status: 'RUNNING',
            attempts: { gte: JOB_MAX_ATTEMPTS },
            lockedAt: { lt: staleBefore },
          },
          { status: 'FAILED' },
        ],
      },
      include: { image: true },
    });
  }
}
