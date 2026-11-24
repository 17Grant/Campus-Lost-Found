import crypto from 'crypto';
import { env } from '../config/env';

export function normalizeAnswer(answer: string): string {
  return answer.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function hashSecretAnswer(itemId: string, answer: string): string {
  return crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${itemId}:${normalizeAnswer(answer)}`)
    .digest('hex');
}

export function verifySecretAnswer(itemId: string, answer: string, storedHash: string): boolean {
  const expected = Buffer.from(storedHash, 'hex');
  const actual = Buffer.from(hashSecretAnswer(itemId, answer), 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}