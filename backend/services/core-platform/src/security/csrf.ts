import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { logger } from '../observability/logger';

// CSRF protection for stateless REST API.
// 
// While this API uses Bearer tokens (not session cookies), CSRF middleware
// is implemented for future compatibility with browser-based clients and
// defense-in-depth. Current REST clients (mobile, server-to-server) are
// unaffected: they must provide Authorization header anyway, which browsers cannot inject.
//
// If browser-based clients are added in future:
//   1. Set CSRF_PROTECTION=true in environment
//   2. Include x-csrf-token header in all POST/PATCH/PUT/DELETE requests
//   3. Token is passed via response header or cookie

const CSRF_PROTECTION_ENABLED = process.env.CSRF_PROTECTION === 'true';
const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = '__csrf_token';
const CSRF_FIELD_NAME = 'csrf_token';

interface CsrfSession {
  token: string;
  createdAt: number;
}

// In-memory store for CSRF tokens. In production, use Redis or similar.
const tokenStore = new Map<string, CsrfSession>();

// Cleanup expired tokens every 5 minutes
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, session] of tokenStore.entries()) {
    if (now - session.createdAt > TOKEN_TTL_MS) {
      tokenStore.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.debug(`CSRF token cleanup: deleted ${cleaned} expired tokens`);
  }
}, 5 * 60 * 1000);

// Generate a new CSRF token
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

// Store CSRF token for the user session
export function storeCsrfToken(sessionId: string, token: string): void {
  tokenStore.set(sessionId, {
    token,
    createdAt: Date.now(),
  });
}

// Retrieve CSRF token for validation
export function getCsrfToken(sessionId: string): string | null {
  const session = tokenStore.get(sessionId);
  if (!session) {
    return null;
  }
  
  // Check expiration
  if (Date.now() - session.createdAt > TOKEN_TTL_MS) {
    tokenStore.delete(sessionId);
    return null;
  }
  
  return session.token;
}

// Middleware: Generate and attach CSRF token to all GET requests
// Token is sent in response header (for REST clients) or cookie (for browser clients)
export function attachCsrfToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!CSRF_PROTECTION_ENABLED) {
    return next();
  }

  // Only generate fresh token on safe methods (GET, HEAD, OPTIONS)
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Key: use session ID from JWT if available, else use connection ID
  const sessionKey = req.userId || `conn_${req.ip}`;
  
  const token = generateCsrfToken();
  storeCsrfToken(sessionKey, token);

  // Send token in response header (REST clients use this)
  res.setHeader('X-CSRF-Token', token);
  
  // Also set as HttpOnly cookie (browser clients use this)
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_TTL_MS,
  });

  next();
}

// Middleware: Validate CSRF token on state-changing methods
// Expects token in header (REST clients) or form body (browser clients)
export function validateCsrfToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!CSRF_PROTECTION_ENABLED) {
    return next();
  }

  // Only validate state-changing methods
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Skip health endpoints (no state mutation)
  if (req.path.startsWith('/health')) {
    return next();
  }

  // Skip internal/admin endpoints that use bearer-only auth
  if (req.path.includes('/admin/') && !req.path.includes('/verify')) {
    return next();
  }

  const sessionKey = req.userId || `conn_${req.ip}`;
  const storedToken = getCsrfToken(sessionKey);

  if (!storedToken) {
    logger.warn(`CSRF: no valid token found for session ${sessionKey}`, {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    return res.status(403).json({
      error: 'CSRF token missing or expired',
      code: 'CSRF_TOKEN_INVALID',
    });
  }

  // Get token from request: check header first (REST clients), then body (browser clients)
  const incomingToken = 
    req.headers[CSRF_HEADER_NAME] ||
    req.body?.[CSRF_FIELD_NAME];

  if (!incomingToken || typeof incomingToken !== 'string') {
    logger.warn(`CSRF: token not provided in request`, {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    return res.status(403).json({
      error: 'CSRF token not provided',
      code: 'CSRF_TOKEN_REQUIRED',
    });
  }

  // Constant-time comparison to prevent timing attacks
  if (!constantTimeEquals(incomingToken, storedToken)) {
    logger.warn(`CSRF: token mismatch`, {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    return res.status(403).json({
      error: 'CSRF token invalid',
      code: 'CSRF_TOKEN_MISMATCH',
    });
  }

  // Token is valid; invalidate it to prevent reuse
  tokenStore.delete(sessionKey);
  
  next();
}

// Constant-time string comparison to prevent timing attacks
function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'hex');
  const bufferB = Buffer.from(b, 'hex');
  
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < bufferA.length; i++) {
    result |= bufferA[i] ^ bufferB[i];
  }
  
  return result === 0;
}

// Export for testing
export { tokenStore };
