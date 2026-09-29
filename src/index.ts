import { env } from './config/env.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { startWorker } from './worker.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`PortreAI is ready on port ${env.PORT}`);
});

if (env.RUN_WORKER) {
  startWorker().catch((error: unknown) => {
    logger.fatal({ err: error }, 'Worker failed to start');
    process.exit(1);
  });
}

async function shutdown(): Promise<void> {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});
