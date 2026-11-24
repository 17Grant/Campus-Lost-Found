import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createClaimSchema, type CreateClaimInput } from '../schemas/claim.schema';
import { verifySecretAnswer } from '../services/secretService';
import { generatePickupCode } from '../lib/pickupCode';

const router = Router();
router.use(requireAuth);

// Keyed by user id, so it must run after requireAuth
const claimLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? 'anonymous',
  message: { error: 'Too many claim attempts. Please try again later.' },
});

const MAX_CODE_ATTEMPTS = 5;

router.post('/', claimLimiter, validate(createClaimSchema), async (req, res) => {
  const { itemId, proofAnswer } = req.body as CreateClaimInput;
  const userId = req.user!.id;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, type: true, status: true, reporterId: true, secretAnswerHash: true },
  });
  if (!item) return res.status(404).json({ error: 'Item not found' });
  if (item.type !== 'FOUND') {
    return res.status(400).json({ error: 'Only found items can be claimed' });
  }
  if (item.reporterId === userId) {
    return res.status(400).json({ error: 'You cannot claim an item you reported' });
  }
  if (item.status === 'OPEN') {
    return res.status(409).json({
      error: 'This item has not been received at the security desk yet. Please check back soon.',
    });
  }
  if (item.status === 'RESOLVED' || item.status === 'ARCHIVED') {
    return res.status(409).json({ error: 'This item is no longer available.' });
  }

  // A hint for the desk admin, never shown to the claimant
  const answerMatch = item.secretAnswerHash
    ? verifySecretAnswer(item.id, proofAnswer, item.secretAnswerHash)
    : null;

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    try {
      const claim = await prisma.$transaction(async (tx) => {
        // Atomic availability check: guards against the item being resolved mid-request
        const available = await tx.item.updateMany({
          where: { id: itemId, status: { in: ['AT_SECURITY_DESK', 'CLAIM_PENDING'] } },
          data: { status: 'CLAIM_PENDING' },
        });
        if (available.count === 0) return null;

        return tx.claim.create({
          data: {
            itemId,
            claimantId: userId,
            proofAnswer,
            answerMatch,
            pickupCode: generatePickupCode(),
          },
          select: { id: true, status: true, pickupCode: true, createdAt: true },
        });
      });

      if (!claim) {
        return res.status(409).json({ error: 'This item is no longer available to claim.' });
      }
      return res.status(201).json({ claim });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = String(err.meta?.target ?? '');
        if (target.includes('pickupCode')) continue; // code collision: generate another
        return res.status(409).json({ error: 'You have already submitted a claim for this item' });
      }
      throw err;
    }
  }

  res.status(503).json({ error: 'Could not generate a pickup code. Please try again.' });
});

router.get('/mine', async (req, res) => {
  const claims = await prisma.claim.findMany({
    where: { claimantId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      pickupCode: true,
      createdAt: true,
      reviewedAt: true,
      item: {
        select: { id: true, title: true, imageUrl: true, custodyLocation: true, status: true },
      },
    },
  });
  res.json({ claims });
});

export default router;