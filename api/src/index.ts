import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { Prisma } from '@prisma/client';
import { env, isProd } from './config/env';
import { generalLimiter } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import itemRoutes from './routes/items';
import claimRoutes from './routes/claims';
import adminRoutes from './routes/admin';
import { startExpiryJob } from './jobs/expiry';

const app = express();

// Behind Render's reverse proxy; needed for correct client IPs and Secure cookies
if (isProd) app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(generalLimiter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRoutes);
app.use('/items', itemRoutes);
app.use('/claims', claimRoutes);
app.use('/admin', adminRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Database unreachable, timed out, or pool exhausted (e.g. Neon waking from idle)
function isDatabaseUnavailable(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(err.code);
  }
  return false;
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const type = (err as { type?: string } | null)?.type;
  if (type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  if (isDatabaseUnavailable(err)) {
    console.error('Database unavailable:', (err as { code?: string }).code ?? err);
    return res
      .status(503)
      .json({ error: 'The service is temporarily unavailable. Please try again in a moment.' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(env.PORT, () => {
  console.log(`API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  startExpiryJob();
});