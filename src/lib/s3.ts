import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  PRESIGN_EXPIRES_SECONDS,
  SIGNED_URL_EXPIRES_SECONDS,
} from '../shared/index.js';
import { env } from '../config/env.js';

let client: S3Client | undefined;

function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return client;
}

export async function presignPutUrl(
  key: string,
  contentType: string,
): Promise<string> {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: PRESIGN_EXPIRES_SECONDS },
  );
}

export async function presignGetUrl(key: string): Promise<string> {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
    }),
    { expiresIn: SIGNED_URL_EXPIRES_SECONDS },
  );
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await s3().send(
      new HeadObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const result = await s3().send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
    }),
  );
  if (!result.Body) {
    throw new Error(`Empty object body for ${key}`);
  }
  return Buffer.from(await result.Body.transformToByteArray());
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
    }),
  );
}

export async function deleteObjects(keys: Array<string | null | undefined>): Promise<void> {
  const unique = [...new Set(keys.filter((key): key is string => Boolean(key)))];
  await Promise.all(unique.map((key) => deleteObject(key)));
}
