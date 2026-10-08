const rateLimit = require('express-rate-limit');

// Helper to determine whether to skip rate limiting (e.g., during automated test suite)
const shouldSkip = (req) => {
  if (process.env.NODE_ENV === 'test') return true;
  if (req.headers['x-bypass-rate-limit'] === process.env.RATE_LIMIT_BYPASS_KEY) return true;
  return false;
};

// 1. General API Rate Limiter (e.g., 300 requests per 15 minutes window)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  skip: shouldSkip,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    status: 429,
    error: 'Too many requests from this IP. Please try again after 15 minutes.'
  }
});

// 2. Strict Auth Limiter (Prevents credential brute-forcing on login & register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 min
  skip: shouldSkip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

// 3. Search Endpoints Rate Limiter (Prevents search query abuse / DOS)
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 queries per minute
  skip: shouldSkip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Search rate limit exceeded. Please slow down.'
  }
});

// 4. File Upload Limiter
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 uploads per 15 min
  skip: shouldSkip,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Upload limit exceeded. Please wait before uploading more files.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  searchLimiter,
  uploadLimiter
};
