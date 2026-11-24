import { Router } from 'express';
import { randomUUID } from 'crypto';
import { ItemStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { createItemLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import {
  createItemSchema,
  listItemsSchema,
  idParamSchema,
  type CreateItemInput,
  type ListItemsQuery,
} from '../schemas/item.schema';
import { CATEGORIES, CAMPUS_ZONES, CUSTODY_LOCATIONS } from '../config/constants';
import { hashSecretAnswer } from '../services/secretService';
import {
  buildItemText,
  embedText,
  findMatches,
  saveEmbedding,
  type MatchRow,
} from '../services/vectorService';

const router = Router();

// The app is campus-only, so every item route requires a signed-in user
router.use(requireAuth);

const PUBLIC_STATUSES: ItemStatus[] = ['OPEN', 'AT_SECURITY_DESK', 'CLAIM_PENDING'];

// Never includes secretAnswerHash, embedding, or reporter details
const publicSelect = {
  id: true,
  type: true,
  status: true,
  title: true,
  category: true,
  description: true,
  campusZone: true,
  custodyLocation: true,
  imageUrl: true,
  eventDate: true,
  createdAt: true,
} as const satisfies Prisma.ItemSelect;

router.get('/meta', (_req, res) => {
  res.json({
    categories: CATEGORIES,
    campusZones: CAMPUS_ZONES,
    custodyLocations: CUSTODY_LOCATIONS,
  });
});

router.post('/', createItemLimiter, validate(createItemSchema), async (req, res) => {
  const body = req.body as CreateItemInput;
  const id = randomUUID();

  const item = await prisma.item.create({
    data: {
      id,
      type: body.type,
      title: body.title,
      category: body.category,
      description: body.description,
      campusZone: body.campusZone,
      custodyLocation: body.type === 'FOUND' ? (body.custodyLocation ?? null) : null,
      imageUrl: body.imageUrl ?? null,
      eventDate: body.eventDate,
      secretPrompt: body.secretPrompt ?? null,
      secretAnswerHash: body.secretAnswer ? hashSecretAnswer(id, body.secretAnswer) : null,
      reporterId: req.user!.id,
    },
    select: publicSelect,
  });

  // The report is already saved; a failure here must not lose it
  let matches: MatchRow[] = [];
  try {
    const embedding = await embedText(buildItemText(item));
    await saveEmbedding(item.id, embedding);
    matches = await findMatches(embedding, body.type === 'LOST' ? 'FOUND' : 'LOST');
  } catch (err) {
    console.error('Embedding/matching failed (item was still saved):', err);
  }

  res.status(201).json({
    item,
    matches: matches.map((m) => ({ ...m, similarity: Math.round(m.similarity * 100) / 100 })),
  });
});

router.get('/', validate(listItemsSchema, 'query'), async (_req, res) => {
  const q = res.locals.query as ListItemsQuery;

  const where: Prisma.ItemWhereInput = { status: { in: PUBLIC_STATUSES } };
  if (q.type) where.type = q.type;
  if (q.category) where.category = q.category;
  if (q.campusZone) where.campusZone = q.campusZone;
  if (q.from || q.to) {
    where.eventDate = { ...(q.from && { gte: q.from }), ...(q.to && { lte: q.to }) };
  }
  if (q.q) {
    where.OR = [
      { title: { contains: q.q, mode: 'insensitive' } },
      { description: { contains: q.q, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.item.findMany({
      where,
      select: publicSelect,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.item.count({ where }),
  ]);

  res.json({
    items,
    page: q.page,
    limit: q.limit,
    total,
    totalPages: Math.ceil(total / q.limit),
  });
});

router.get('/:id', validate(idParamSchema, 'params'), async (req, res) => {
  const { id } = res.locals.params as { id: string };

  const item = await prisma.item.findUnique({
    where: { id },
    select: { ...publicSelect, secretPrompt: true, reporterId: true },
  });
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const isMine = item.reporterId === req.user!.id;
  const isAdmin = req.user!.role === 'SECURITY_ADMIN';
  if (item.status === 'ARCHIVED' && !isMine && !isAdmin) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const { reporterId: _reporterId, secretPrompt, ...rest } = item;
  res.json({
    item: {
      ...rest,
      // Shown to claimants so they know what to answer; the answer itself is never returned
      secretPrompt: item.type === 'FOUND' ? secretPrompt : null,
      isMine,
    },
  });
});

export default router;