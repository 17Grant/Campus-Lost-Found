import { Router } from 'express';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { signSession, sessionCookieOptions } from '../lib/jwt';
import { requireAuth } from '../middleware/auth';
import { otpRequestLimiter, otpVerifyLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { requestOtpSchema, verifyOtpSchema } from '../schemas/auth.schema';
import { issueOtp, verifyOtp } from '../services/otpService';
import { sendOtpEmail } from '../services/emailService';

const router = Router();

router.post('/request-otp', otpRequestLimiter, validate(requestOtpSchema), async (req, res) => {
  const { email } = req.body as { email: string };

  const issued = await issueOtp(email);
  if (!issued.ok) {
    return res.status(429).json({ error: 'Too many codes requested. Please wait a few minutes.' });
  }

  try {
    await sendOtpEmail(email, issued.code);
  } catch (err) {
    console.error('Email send failed:', err);
    return res.status(503).json({ error: 'Could not send the code. Please try again shortly.' });
  }

  res.json({ message: 'Code sent. Check your campus email.' });
});

router.post('/verify-otp', otpVerifyLimiter, validate(verifyOtpSchema), async (req, res) => {
  const { email, code, fullName } = req.body as {
    email: string;
    code: string;
    fullName?: string;
  };

  const valid = await verifyOtp(email, code);
  if (!valid) return res.status(401).json({ error: 'Invalid or expired code' });

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, fullName: fullName ?? email.split('@')[0] },
    select: { id: true, email: true, fullName: true, role: true },
  });

  res.cookie(env.COOKIE_NAME, signSession(user.id), sessionCookieOptions);
  res.json({ user });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, fullName: true, role: true, studentId: true },
  });
  res.json({ user });
});

router.post('/logout', (_req, res) => {
  const { maxAge, ...clearOptions } = sessionCookieOptions;
  res.clearCookie(env.COOKIE_NAME, clearOptions);
  res.json({ message: 'Logged out' });
});

export default router;