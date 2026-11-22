import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { verifySession } from '../lib/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: Role };
    }
  }
}

// Loads the user from the database on every request, so role changes
// (e.g. promoting someone to SECURITY_ADMIN) apply immediately without re-login.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[env.COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const userId = verifySession(token);
  if (!userId) return res.status(401).json({ error: 'Invalid or expired session' });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== Role.SECURITY_ADMIN) {
    return res.status(403).json({ error: 'Security admin access required' });
  }
  next();
}