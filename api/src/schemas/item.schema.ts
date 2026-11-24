import { z } from 'zod';
import { env } from '../config/env';
import { CATEGORIES, CAMPUS_ZONES, CUSTODY_LOCATIONS } from '../config/constants';

const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

const imageUrl = z
  .string()
  .url()
  .refine(
    (u) => u.startsWith(`https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/`),
    'Image must be uploaded through the app',
  );

export const createItemSchema = z
  .object({
    type: z.enum(['LOST', 'FOUND']),
    title: z.string().trim().min(3).max(100),
    category: z.enum(CATEGORIES),
    description: z
      .string()
      .trim()
      .min(10, 'Add a bit more detail (at least 10 characters)')
      .max(1000),
    campusZone: z.enum(CAMPUS_ZONES),
    custodyLocation: z.preprocess(emptyToUndefined, z.enum(CUSTODY_LOCATIONS).optional()),
    imageUrl: z.preprocess(emptyToUndefined, imageUrl.optional()),
    eventDate: z.coerce
      .date()
      .refine((d) => d.getTime() <= Date.now() + 5 * 60 * 1000, 'Date cannot be in the future'),
    secretPrompt: z.preprocess(emptyToUndefined, z.string().trim().min(5).max(200).optional()),
    secretAnswer: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(100).optional()),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'FOUND' && !v.custodyLocation) {
      ctx.addIssue({
        code: 'custom',
        path: ['custodyLocation'],
        message: 'Choose where you handed the item in',
      });
    }
    if (v.type === 'LOST' && (v.secretPrompt || v.secretAnswer)) {
      ctx.addIssue({
        code: 'custom',
        path: ['secretPrompt'],
        message: 'Verification questions apply to found items only',
      });
    }
    if (Boolean(v.secretPrompt) !== Boolean(v.secretAnswer)) {
      ctx.addIssue({
        code: 'custom',
        path: ['secretAnswer'],
        message: 'Provide both the question and its answer',
      });
    }
  });

export const listItemsSchema = z.object({
  type: z.preprocess(emptyToUndefined, z.enum(['LOST', 'FOUND']).optional()),
  category: z.preprocess(emptyToUndefined, z.enum(CATEGORIES).optional()),
  campusZone: z.preprocess(emptyToUndefined, z.enum(CAMPUS_ZONES).optional()),
  q: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(100).optional()),
  from: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  to: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type ListItemsQuery = z.infer<typeof listItemsSchema>;