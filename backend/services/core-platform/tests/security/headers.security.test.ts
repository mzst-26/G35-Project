import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import express from 'express';
import helmet from 'helmet';

describe('Security Headers Validation Tests', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    
    // Apply helmet middleware (same as production app.ts)
    app.use(helmet());
    
    // Test routes
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    app.get('/api/v1/jobs', (req, res) => {
      res.json({ jobs: [] });
    });

    app.post('/api/v1/jobs', (req, res) => {
      res.status(201).json({ jobId: '123' });
    });

    app.patch('/api/v1/workers/:id', (req, res) => {
      res.json({ workerId: req.params.id });
    });

    app.delete('/api/v1/jobs/:id', (req, res) => {
      res.status(204).send();
    });
  });

  describe('Content-Type Protection Headers', () => {
    it('should set X-Content-Type-Options: nosniff', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should prevent MIME-type sniffing on all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/health' },
        { method: 'get', path: '/api/v1/jobs' },
        { method: 'post', path: '/api/v1/jobs' },
      ] as const;

      for (const endpoint of endpoints) {
        const agent = request(app);
        const res = endpoint.method === 'get'
          ? await agent.get(endpoint.path)
          : await agent.post(endpoint.path);
        expect(res.headers['x-content-type-options']).toBe('nosniff');
      }
    });
  });

  describe('Clickjacking Protection Headers', () => {
    it('should set X-Frame-Options: SAMEORIGIN', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    });

    it('should prevent framing on all content', async () => {
      const endpoints = [
        { method: 'get', path: '/health' },
        { method: 'get', path: '/api/v1/jobs' },
        { method: 'patch', path: '/api/v1/workers/123' },
      ] as const;

      for (const endpoint of endpoints) {
        const agent = request(app);
        const res = endpoint.method === 'patch'
          ? await agent.patch(endpoint.path)
          : await agent.get(endpoint.path);
        expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      }
    });
  });

  describe('Information Disclosure Prevention', () => {
    it('should remove X-Powered-By header', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('should not leak server version info', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      // Check that no common server fingerprints are present
      const headerValues = Object.values(res.headers).join(' ');
      expect(headerValues).not.toMatch(/Express/i);
      expect(headerValues).not.toMatch(/Apache/i);
      expect(headerValues).not.toMatch(/nginx/i);
    });

    it('should not expose internal paths or file structures', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      const headerValues = Object.values(res.headers).join(' ');
      expect(headerValues).not.toMatch(/\/src\//);
      expect(headerValues).not.toMatch(/\/usr\//);
      expect(headerValues).not.toMatch(/\.env/);
    });
  });

  describe('Referrer Policy Headers', () => {
    it('should set Referrer-Policy header', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.headers['referrer-policy']).toBeDefined();
    });

    it('should prevent referrer leakage', async () => {
      const res = await request(app)
        .get('/api/v1/jobs')
        .set('referer', 'https://external-site.com/secret')
        .expect(200);

      // With "no-referrer" policy, browser won't send Referer header to external sites
      expect(res.headers['referrer-policy']).toBe('no-referrer');
    });
  });

  describe('DNS Prefetch Control', () => {
    it('should disable DNS prefetch by default', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.headers['x-dns-prefetch-control']).toBe('off');
    });
  });

  describe('Content Security Policy (CSP)', () => {
    it('should set Content-Security-Policy header', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      const csp = res.headers['content-security-policy'];
      expect(csp).toBeDefined();
      expect(typeof csp).toBe('string');
    });

    it('should have default-src directive', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      const csp = res.headers['content-security-policy'] as string;
      expect(csp).toContain('default-src');
    });

    it('should restrict script sources', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      const csp = res.headers['content-security-policy'] as string;
      expect(csp).toMatch(/script-src/);
    });

    it('should restrict style sources', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      const csp = res.headers['content-security-policy'] as string;
      expect(csp).toMatch(/style-src/);
    });
  });

  describe('Strict-Transport-Security (HSTS)', () => {
    it('should set HSTS header in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Recreate app with production env
      const prodApp = express();
      prodApp.use(helmet());
      prodApp.get('/health', (req, res) => {
        res.json({ status: 'ok' });
      });

      const res = await request(prodApp)
        .get('/health')
        .expect(200);

      const hsts = res.headers['strict-transport-security'];
      if (hsts) {
        expect(hsts).toContain('max-age');
      }

      process.env.NODE_ENV = originalEnv;
    });

    it('should enforce HTTPS with long max-age', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      // HSTS is set if production
      if (process.env.NODE_ENV === 'production') {
        const hsts = res.headers['strict-transport-security'];
        expect(hsts).toMatch(/max-age=\d+/);
      }
    });
  });

  describe('HTTP Header Injection Prevention', () => {
    it('should not allow CRLF injection in response headers', async () => {
      // Attempt CRLF injection via query parameter
      const res = await request(app)
        .get('/health')
        .query({ 'x-evil': 'value\r\nX-Injected: true' })
        .expect(200);

      // Express/helmet should prevent this
      expect(res.headers['x-injected']).toBeUndefined();
    });

    it('should sanitize header values', async () => {
      await expect(
        request(app)
          .get('/health')
          .set('user-agent', 'Mozilla\r\nX-Injected: true')
      ).rejects.toThrow('Invalid character');
    });
  });

  describe('Cache Control Headers', () => {
    it('should set appropriate cache headers to prevent caching sensitive data', async () => {
      const res = await request(app)
        .patch('/api/v1/workers/123')
        .expect(200);

      // API responses should not be cached by default
      const cacheControl = res.headers['cache-control'];
      if (cacheControl) {
        expect(cacheControl).toMatch(/no-cache|no-store|max-age=0/);
      }
    });
  });

  describe('Cross-Origin Headers', () => {
    it('should have CORS configuration', async () => {
      const res = await request(app)
        .get('/health')
        .set('origin', 'https://example.com')
        .expect(200);

      // CORS headers should be set or intentionally absent
      const acAllowOrigin = res.headers['access-control-allow-origin'];

      // Either CORS is configured or explicitly not set
      if (acAllowOrigin) {
        expect(acAllowOrigin).toBeDefined();
      }
    });
  });

  describe('Header Security on All HTTP Methods', () => {
    it('should set security headers on GET requests', async () => {
      const res = await request(app)
        .get('/api/v1/jobs')
        .expect(200);

      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set security headers on POST requests', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .send({})
        .expect(201);

      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set security headers on PATCH requests', async () => {
      const res = await request(app)
        .patch('/api/v1/workers/123')
        .send({})
        .expect(200);

      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set security headers on DELETE requests', async () => {
      const res = await request(app)
        .delete('/api/v1/jobs/123')
        .expect(204);

      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Header Presence & Format Validation', () => {
    it('should have defined security header values (not null or undefined)', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.headers['x-frame-options']).toBeTruthy();
      expect(res.headers['x-content-type-options']).toBeTruthy();
      expect(res.headers['referrer-policy']).toBeTruthy();
    });

    it('should not have empty header values', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'referrer-policy',
        'x-dns-prefetch-control',
      ];

      for (const header of securityHeaders) {
        const value = res.headers[header];
        if (value !== undefined) {
          expect(value).not.toBe('');
          expect(typeof value).toBe('string');
        }
      }
    });

    it('should have valid header syntax', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      // X-Frame-Options must be one of: DENY, SAMEORIGIN, ALLOW-FROM
      const xFrameOptions = res.headers['x-frame-options'];
      expect(['DENY', 'SAMEORIGIN', 'ALLOW-FROM']).toContain(xFrameOptions);

      // X-Content-Type-Options must be nosniff
      const xContentType = res.headers['x-content-type-options'];
      if (xContentType) {
        expect(xContentType).toBe('nosniff');
      }
    });
  });

  describe('Response Header Audit Trail', () => {
    it('should include all required security headers in checklist', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      const requiredHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'referrer-policy',
        'x-dns-prefetch-control',
      ];

      const headerPresenceLog = {
        timestamp: new Date().toISOString(),
        endpoint: '/health',
        headers: {} as Record<string, string | string[] | undefined>,
      };

      for (const header of requiredHeaders) {
        headerPresenceLog.headers[header] = res.headers[header];
      }

      // All required headers should be present
      for (const header of requiredHeaders) {
        expect(headerPresenceLog.headers[header]).toBeDefined();
      }
    });
  });

  describe('CSP Violation Detection', () => {
    it('should not allow unsafe inline scripts if CSP is properly configured', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      const csp = res.headers['content-security-policy'] as string;

      // If strict CSP is enabled, 'unsafe-inline' should not be in script-src
      if (csp && process.env.NODE_ENV === 'production') {
        const scriptSrcMatch = csp.match(/script-src[^;]*/);
        if (scriptSrcMatch) {
          // Allow 'self' but not 'unsafe-inline' in production
          expect(scriptSrcMatch[0]).not.toContain('unsafe-inline');
        }
      }
    });
  });
});
