import { describe, it, expect } from 'vitest';
import { NextResponse } from 'next/server';
import { applySecurityHeaders } from '@/lib/utils/security-headers';

describe('lib/utils/security-headers.ts', () => {
  it('applies X-Content-Type-Options header', () => {
    const response = applySecurityHeaders(new NextResponse());
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('applies X-Frame-Options header', () => {
    const response = applySecurityHeaders(new NextResponse());
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('applies X-XSS-Protection header', () => {
    const response = applySecurityHeaders(new NextResponse());
    expect(response.headers.get('X-XSS-Protection')).toBe('0');
  });

  it('applies Referrer-Policy header', () => {
    const response = applySecurityHeaders(new NextResponse());
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it('applies Permissions-Policy header', () => {
    const response = applySecurityHeaders(new NextResponse());
    const policy = response.headers.get('Permissions-Policy');
    expect(policy).toContain('accelerometer=()');
    expect(policy).toContain('camera=()');
    expect(policy).toContain('microphone=()');
  });

  it('applies Content-Security-Policy header', () => {
    const response = applySecurityHeaders(new NextResponse());
    const csp = response.headers.get('Content-Security-Policy');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('accepts CSP nonce option', () => {
    const response = applySecurityHeaders(new NextResponse(), { cspNonce: 'abc123' });
    const csp = response.headers.get('Content-Security-Policy');
    expect(csp).toContain("'nonce-abc123'");
  });

  it('applies HSTS header in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const response = applySecurityHeaders(new NextResponse());
    const hsts = response.headers.get('Strict-Transport-Security');

    expect(hsts).toBeDefined();
    expect(hsts).toContain('max-age=31536000');

    process.env.NODE_ENV = originalEnv;
  });

  it('skips HSTS header in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const response = applySecurityHeaders(new NextResponse());
    const hsts = response.headers.get('Strict-Transport-Security');

    expect(hsts).toBeNull();

    process.env.NODE_ENV = originalEnv;
  });

  it('includes preload in HSTS when specified', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const response = applySecurityHeaders(new NextResponse(), { includeHstsPreload: true });
    const hsts = response.headers.get('Strict-Transport-Security');

    expect(hsts).toContain('preload');

    process.env.NODE_ENV = originalEnv;
  });

  it('returns response object for chaining', () => {
    const response = new NextResponse();
    const result = applySecurityHeaders(response);

    expect(result).toBe(response);
    expect(result instanceof NextResponse).toBe(true);
  });
});
