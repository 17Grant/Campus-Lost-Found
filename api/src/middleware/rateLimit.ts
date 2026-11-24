import rateLimit from 'express-rate-limit';

const base = {
  standardHeaders: true,
  legacyHeaders: false,
};

export const generalLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: { error: 'Too many requests. Please try again later.' },
});

export const otpRequestLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Too many code requests. Please wait a few minutes.' },
});

export const otpVerifyLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { error: 'Too many attempts. Please wait a few minutes.' },
});

// Keyed by user id, so it must run after requireAuth
export const createItemLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 15,
  keyGenerator: (req) => req.user?.id ?? 'anonymous',
  message: { error: 'You have submitted too many reports. Please try again later.' },
});