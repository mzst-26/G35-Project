import type { NextResponse } from 'next/server';

export interface SecurityHeadersOptions {
  cspNonce?: string;
  includeHstsPreload?: boolean;
}

export function applySecurityHeaders(
  response: NextResponse,
  options: SecurityHeadersOptions = {},
): NextResponse {
  // Prevent browser from guessing content type (stops MIME-type sniffing)
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Disable XSS protection filter (modern browsers use CSP instead)
  response.headers.set('X-XSS-Protection', '0');

  // Referrer policy: only send referrer to same-origin
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy: disable sensitive APIs
  response.headers.set(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  );

  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // For Next.js inline scripts; use nonce in production
    "style-src 'self' 'unsafe-inline'", // For inline styles; use nonce in production
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (options.cspNonce) {
    cspDirectives.push(`script-src 'self' 'nonce-${options.cspNonce}'`);
  }

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // HSTS: enforce HTTPS (max-age 1 year, include subdomains)
  if (process.env.NODE_ENV === 'production') {
    const hstsValue = options.includeHstsPreload ? 'max-age=31536000; includeSubDomains; preload' : 'max-age=31536000; includeSubDomains';
    response.headers.set('Strict-Transport-Security', hstsValue);
  }

  return response;
}
