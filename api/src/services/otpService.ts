import crypto from 'crypto';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

const MAX_CODES_PER_WINDOW = 3;
const WINDOW_MS = 10 * 60 * 1000;

function hashCode(email: string, code: string): string {
  return crypto.createHmac('sha256', env.JWT_SECRET).update(`${email}:${code}`).digest('hex');
}

export type IssueResult = { ok: true; code: string } | { ok: false; reason: 'RATE_LIMITED' };

export async function issueOtp(email: string): Promise<IssueResult> {
  const since = new Date(Date.now() - WINDOW_MS);
  const recent = await prisma.otpCode.count({
    where: { email, createdAt: { gte: since } },
  });
  if (recent >= MAX_CODES_PER_WINDOW) return { ok: false, reason: 'RATE_LIMITED' };

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  const now = new Date();

  // Invalidate earlier unused codes so only the newest one works
  await prisma.$transaction([
    prisma.otpCode.updateMany({
      where: { email, consumedAt: null },
      data: { consumedAt: now },
    }),
    prisma.otpCode.create({
      data: {
        email,
        codeHash: hashCode(email, code),
        expiresAt: new Date(now.getTime() + env.OTP_TTL_MINUTES * 60 * 1000),
      },
    }),
  ]);

  return { ok: true, code };
}

export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const record = await prisma.otpCode.findFirst({
    where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) return false;

  const updated = await prisma.otpCode.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 } },
  });

  if (updated.attempts > env.OTP_MAX_ATTEMPTS) {
    await prisma.otpCode.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return false;
  }

  const expected = Buffer.from(record.codeHash, 'hex');
  const actual = Buffer.from(hashCode(email, code), 'hex');
  const match = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  if (!match) return false;

  // Atomic one-time use: only one concurrent request can flip consumedAt
  const consumed = await prisma.otpCode.updateMany({
    where: { id: record.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  return consumed.count === 1;
}