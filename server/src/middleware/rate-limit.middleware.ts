import rateLimit from 'express-rate-limit';

// General API Rate Limiter: max 1000 requests per 15 mins per IP
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' },
});

// Authentication Brute-Force Rate Limiter: max 15 attempts per 5 mins per IP
export const loginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 5 minutes before trying again.' },
});

// Registration Rate Limiter: max 5 requests per 15 mins per IP
export const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration requests from this IP. Please try again later.' },
});
