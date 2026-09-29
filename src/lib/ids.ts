import { randomBytes } from 'node:crypto';

export function createId(prefix?: string): string {
  const id = randomBytes(12).toString('hex');
  return prefix ? `${prefix}_${id}` : id;
}
