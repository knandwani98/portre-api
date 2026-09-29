import { clerkMiddleware } from '@clerk/express';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorMiddleware } from './middleware/error.js';
import { notFoundMiddleware } from './middleware/not-found.js';
import { imagesRouter } from './modules/images/images.router.js';
import { uploadsRouter } from './modules/uploads/uploads.router.js';

export function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req: { url?: string }) => req.url === '/health',
      },
    }),
  );
  app.use(
    clerkMiddleware({
      authorizedParties: env.FRONTEND_ORIGIN,
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  const uploadLimiter = rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/v1/uploads', uploadLimiter, uploadsRouter);
  app.use('/api/v1/images', imagesRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
