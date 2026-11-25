import { prisma } from '../lib/prisma';

const EXPIRY_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

// Items with a pending claim are left alone so an in-progress handover is never interrupted
export async function archiveStaleItems(): Promise<number> {
  const cutoff = new Date(Date.now() - EXPIRY_DAYS * DAY_MS);

  const stale = await prisma.item.findMany({
    where: { status: { in: ['OPEN', 'AT_SECURITY_DESK'] }, createdAt: { lt: cutoff } },
    select: { id: true, title: true, reporterId: true },
  });
  if (stale.length === 0) return 0;

  await prisma.$transaction([
    prisma.item.updateMany({
      where: {
        id: { in: stale.map((i) => i.id) },
        status: { in: ['OPEN', 'AT_SECURITY_DESK'] },
      },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    }),
    prisma.notification.createMany({
      data: stale.map((i) => ({
        userId: i.reporterId,
        message: `Your report "${i.title}" was archived after ${EXPIRY_DAYS} days. You can submit a new report if you still need help.`,
      })),
    }),
  ]);

  return stale.length;
}

// Runs shortly after startup, then daily. Startup runs also cover hosts that sleep when idle.
export function startExpiryJob(): void {
  const run = () =>
    archiveStaleItems()
      .then((count) => {
        if (count > 0) console.log(`Archived ${count} stale item(s)`);
      })
      .catch((err) => console.error('Expiry job failed:', err));

  setTimeout(run, 30_000).unref();
  setInterval(run, DAY_MS).unref();
}