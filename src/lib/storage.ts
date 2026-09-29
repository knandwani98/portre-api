import { env } from '../config/env.js';
import * as s3Storage from './s3.js';

export function objectKey(clerkId: string, imageId: string, suffix = 'original'): string {
  return `${env.S3_PREFIX}/users/${clerkId}/${imageId}/${suffix}`;
}

export function presignPutUrl(key: string, contentType: string): Promise<string> {
  return s3Storage.presignPutUrl(key, contentType);
}

export function presignGetUrl(key: string): Promise<string> {
  return s3Storage.presignGetUrl(key);
}

export function objectExists(key: string): Promise<boolean> {
  return s3Storage.objectExists(key);
}

export function getObjectBuffer(key: string): Promise<Buffer> {
  return s3Storage.getObjectBuffer(key);
}

export function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  return s3Storage.putObject(key, body, contentType);
}

export function deleteObject(key: string): Promise<void> {
  return s3Storage.deleteObject(key);
}

export function deleteObjects(keys: Array<string | null | undefined>): Promise<void> {
  return s3Storage.deleteObjects(keys);
}
