import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

// Single entry point for notifications. Today it stores an in-app row; email,
// web push, or WhatsApp can be added here later without touching any caller.
export async function notify(userId: string, message: string, db: Db = prisma): Promise<void> {
  await db.notification.create({ data: { userId, message } });
}