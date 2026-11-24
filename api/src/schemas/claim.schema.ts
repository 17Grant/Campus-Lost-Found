import { z } from 'zod';

export const createClaimSchema = z.object({
  itemId: z.string().uuid(),
  proofAnswer: z.string().trim().min(2, 'Please give a more detailed answer').max(500),
});

export type CreateClaimInput = z.infer<typeof createClaimSchema>;