import { JOB_POLL_INTERVAL_MS } from './shared/index.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { UploadsRepository } from './modules/uploads/uploads.repository.js';
import { loadFaceModels } from './pipeline/face-detector.js';
import { processImageJob } from './pipeline/process-image.js';

const uploads = new UploadsRepository();
let running = false;

export async function startWorker(): Promise<void> {
  await loadFaceModels();
  running = true;
  logger.info('Ready to process uploaded photos');
  void loop();
}

export function stopWorker(): void {
  running = false;
}

async function loop(): Promise<void> {
  while (running) {
    try {
      const job = await uploads.claimNext();
      if (!job) {
        await sleep(JOB_POLL_INTERVAL_MS);
        continue;
      }
      await processImageJob(job.id, job.image);
    } catch (error) {
      logger.error({ err: error }, 'Worker loop error');
      await sleep(JOB_POLL_INTERVAL_MS);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main(): Promise<void> {
  await startWorker();
}

const isMain = process.argv[1]?.includes('worker');
if (isMain) {
  main().catch((error: unknown) => {
    logger.fatal({ err: error }, 'Worker failed to start');
    void prisma.$disconnect();
    process.exit(1);
  });
}
