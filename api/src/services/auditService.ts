import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

export async function logAudit(
  entry: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Prisma.InputJsonValue;
  },
  db: Db = prisma,
): Promise<void> {
  await db.auditLog.create({ data: entry });
}