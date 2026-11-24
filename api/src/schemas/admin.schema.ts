import { z } from 'zod';
import { CUSTODY_LOCATIONS } from '../config/constants';

const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

export const intakeSchema = z
  .object({
    custodyLocation: z.preprocess(emptyToUndefined, z.enum(CUSTODY_LOCATIONS).optional()),
    secretPrompt: z.preprocess(emptyToUndefined, z.string().trim().min(5).max(200).optional()),
    secretAnswer: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(100).optional()),
  })
  .superRefine((v, ctx) => {
    if (Boolean(v.secretPrompt) !== Boolean(v.secretAnswer)) {
      ctx.addIssue({
        code: 'custom',
        path: ['secretAnswer'],
        message: 'Provide both the question and its answer',
      });
    }
  });

export const decisionSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
});

export const claimsQuerySchema = z.object({
  code: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{6}$/, 'Pickup codes are 6 characters')
      .optional(),
  ),
});

export type IntakeInput = z.infer<typeof intakeSchema>;