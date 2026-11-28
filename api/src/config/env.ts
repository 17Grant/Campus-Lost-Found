import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  FRONTEND_URL: z.string().url(),
  ALLOWED_DOMAIN: z
    .string()
    .regex(/^@[a-z0-9.-]+\.[a-z]{2,}$/i, 'ALLOWED_DOMAIN must look like @st.example.edu.gh'),
  COOKIE_NAME: z.string().default('campus_token'),
  SESSION_DAYS: z.coerce.number().int().positive().default(7),
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  BREVO_API_KEY: z.string().min(1, 'BREVO_API_KEY is required'),
  EMAIL_FROM_ADDRESS: z.string().email(),
  EMAIL_FROM_NAME: z.string().default('Campus Lost & Found'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  // Number of reverse proxies in front of the API (Render only = 1, Vercel + Render = 2)
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
  // Set to 1 temporarily to expose /debug/ip while tuning TRUST_PROXY_HOPS
  DEBUG_IP: z.enum(['0', '1']).default('0'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';