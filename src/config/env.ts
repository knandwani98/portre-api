import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  S3_BUCKET_NAME: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_REGION: z.string().min(1).default('auto'),
  S3_PREFIX: z.enum(['local', 'prod']).default('local'),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  FRONTEND_ORIGIN: z.string().url(),
  PORT: z.coerce.number().int().positive().default(4000),
  RUN_WORKER: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(details)}`);
  }
  return parsed.data;
}

export const env = loadEnv();
