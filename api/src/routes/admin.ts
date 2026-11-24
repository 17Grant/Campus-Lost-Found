import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { idParamSchema } from '../schemas/item.schema';
import {
  intakeSchema,
  decisionSchema,
  claimsQuerySchema,
  type IntakeInput,
} from '../schemas/admin.schema';
import { hashSecretAnswer } from '../services/secretService';
import { notify } from '../services/notifyService';
import { logAudit } from '../services/auditService';

const router = Router();
router.use(requireAuth, requireAdmin);

// Neon can be slow after idle, so give transactions more room than the 5s default
const TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 };

// Found items reported online but not yet physically received at the desk
router.get('/intake', async (_req, res) => {
  const items = await prisma.item.findMany({
    where: { type: 'FOUND', status: 'OPEN' },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      imageUrl: true,
      campusZone: true,
      custodyLocation: true,
      eventDate: true,
      createdAt: true,
      secretPrompt: true,
      reporter: { select: { fullName: true, email: true } },
    },
  });
  res.json({ items });
});

// Admin confirms the item is physically at the desk; this opens it for claims
router.post(
  '/items/:id/intake',
  validate(idParamSchema, 'params'),
  validate(intakeSchema),
  async (req, res) => {
    const { id } = res.locals.params as { id: string };
    const body = req.body as IntakeInput;
    const adminId = req.user!.id;

    const item = await prisma.$transaction(async (tx) => {
      const data: Prisma.ItemUpdateManyMutationInput = { status: 'AT_SECURITY_DESK' };
      if (body.custodyLocation) data.custodyLocation = body.custodyLocation;
      if (body.secretPrompt && body.secretAnswer) {
        data.secretPrompt = body.secretPrompt;
        data.secretAnswerHash = hashSecretAnswer(id, body.secretAnswer);
      }

      const updated = await tx.item.updateMany({
        where: { id, type: 'FOUND', status: 'OPEN' },
        data,
      });
      if (updated.count === 0) return null;

      const received = await tx.item.findUniqueOrThrow({
        where: { id },
        select: { id: true, title: true, status: true, reporterId: true },
      });
      await logAudit(
        { actorId: adminId, action: 'ITEM_RECEIVED', entityType: 'Item', entityId: id },
        tx,
      );
      await notify(
        received.reporterId,
        `Your found item "${received.title}" was received at the security desk. Thank you!`,
        tx,
      );
      return received;
    }, TX_OPTIONS);

    if (!item) {
      return res
        .status(409)
        .json({ error: 'Item not found, not a found item, or already received' });
    }
    res.json({ item: { id: item.id, status: item.status } });
  },
);

// Pending claims, optionally narrowed to one pickup code
router.get('/claims', validate(claimsQuerySchema, 'query'), async (_req, res) => {
  const { code } = res.locals.query as { code?: string };

  const claims = await prisma.claim.findMany({
    where: { status: 'PENDING', ...(code ? { pickupCode: code } : {}) },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      proofAnswer: true,
      answerMatch: true,
      pickupCode: true,
      createdAt: true,
      item: {
        select: {
          id: true,
          title: true,
          category: true,
          description: true,
          imageUrl: true,
          custodyLocation: true,
          secretPrompt: true,
        },
      },
      claimant: { select: { fullName: true, email: true, studentId: true } },
    },
  });
  res.json({ claims });
});

router.post(
  '/claims/:id/decision',
  validate(idParamSchema, 'params'),
  validate(decisionSchema),
  async (req, res) => {
    const { id } = res.locals.params as { id: string };
    const { decision } = req.body as { decision: 'APPROVED' | 'REJECTED' };
    const adminId = req.user!.id;
    const now = new Date();

    const outcome = await prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findUnique({
        where: { id },
        select: {
          id: true,
          itemId: true,
          claimantId: true,
          item: { select: { title: true, reporterId: true } },
        },
      });
      if (!claim) return { error: 'not_found' as const };

      // Only one admin can move a claim out of PENDING
      const reviewed = await tx.claim.updateMany({
        where: { id, status: 'PENDING' },
        data: { status: decision, reviewedById: adminId, reviewedAt: now },
      });
      if (reviewed.count === 0) return { error: 'already_reviewed' as const };

      const title = claim.item.title;

      if (decision === 'APPROVED') {
        const others = await tx.claim.findMany({
          where: { itemId: claim.itemId, status: 'PENDING' },
          select: { id: true, claimantId: true },
        });
        if (others.length > 0) {
          await tx.claim.updateMany({
            where: { id: { in: others.map((c) => c.id) } },
            data: { status: 'REJECTED', reviewedById: adminId, reviewedAt: now },
          });
        }
        await tx.item.update({ where: { id: claim.itemId }, data: { status: 'RESOLVED' } });

        await notify(claim.claimantId, `Your claim for "${title}" was approved.`, tx);
        await notify(claim.item.reporterId, `The item you found, "${title}", was returned to its owner.`, tx);
        for (const other of others) {
          await notify(other.claimantId, `"${title}" has been returned to another claimant.`, tx);
        }
      } else {
        const remaining = await tx.claim.count({
          where: { itemId: claim.itemId, status: 'PENDING' },
        });
        if (remaining === 0) {
          await tx.item.updateMany({
            where: { id: claim.itemId, status: 'CLAIM_PENDING' },
            data: { status: 'AT_SECURITY_DESK' },
          });
        }
        await notify(
          claim.claimantId,
          `Your claim for "${title}" was not approved. Visit the security desk if you believe this is a mistake.`,
          tx,
        );
      }

      await logAudit(
        {
          actorId: adminId,
          action: decision === 'APPROVED' ? 'CLAIM_APPROVED' : 'CLAIM_REJECTED',
          entityType: 'Claim',
          entityId: id,
          metadata: { itemId: claim.itemId },
        },
        tx,
      );
      return { ok: true as const };
    }, TX_OPTIONS);

    if ('error' in outcome) {
      return outcome.error === 'not_found'
        ? res.status(404).json({ error: 'Claim not found' })
        : res.status(409).json({ error: 'This claim was already reviewed' });
    }
    res.json({ claim: { id, status: decision } });
  },
);

export default router;