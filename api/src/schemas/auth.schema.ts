import { z } from 'zod';
import { env } from '../config/env';

const domain = env.ALLOWED_DOMAIN.toLowerCase();

const campusEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email('Enter a valid email address')
  .refine((e) => e.endsWith(domain), `Use your campus email (${domain})`);

export const requestOtpSchema = z.object({
  email: campusEmail,
});

export const verifyOtpSchema = z.object({
  email: campusEmail,
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  fullName: z.string().trim().min(2).max(100).optional(),
});