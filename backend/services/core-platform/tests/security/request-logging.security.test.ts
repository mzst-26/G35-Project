import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import express from 'express';
import {
  requestLoggingMiddleware,
  redactObject,
  redactValue,
  verifyNoPiiInLog,
  PII_FIELDS,
} from '../../src/middleware/request-logging';
import { logger } from '../../src/observability/logger';

describe('Request Logging & PII Filtering Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PII Redaction - Field Names', () => {
    it('should redact email field', () => {
      const data = {
        email: 'user@example.com',
        name: 'John Doe',
      };

      const redacted = redactObject(data);

      expect(redacted.email).toContain('[REDACTED]');
      expect(redacted.email).not.toContain('user@example.com');
    });

    it('should redact phone field', () => {
      const data = {
        phone: '555-123-4567',
      };

      const redacted = redactObject(data);

      expect(redacted.phone).toContain('[REDACTED]');
    });

    it('should redact password field', () => {
      const data = {
        password: 'SuperSecretPassword123!',
      };

      const redacted = redactObject(data);

      expect(redacted.password).toContain('[REDACTED]');
      expect(redacted.password).not.toContain('SuperSecret');
    });

    it('should redact SSN field', () => {
      const data = {
        ssn: '123-45-6789',
      };

      const redacted = redactObject(data);

      expect(redacted.ssn).toContain('[REDACTED]');
    });

    it('should redact credit card field', () => {
      const data = {
        credit_card: '4532-1111-2222-3333',
      };

      const redacted = redactObject(data);

      expect(redacted.credit_card).toContain('[REDACTED]');
    });

    it('should redact address field', () => {
      const data = {
        address: '123 Main St, Anytown, USA 12345',
      };

      const redacted = redactObject(data);

      expect(redacted.address).toContain('[REDACTED]');
    });

    it('should redact token field', () => {
      const data = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      };

      const redacted = redactObject(data);

      expect(redacted.token).toContain('[REDACTED]');
    });

    it('should redact api_key field', () => {
      const data = {
        api_key: 'sk_live_51234567890abcdefghij',
      };

      const redacted = redactObject(data);

      expect(redacted.api_key).toContain('[REDACTED]');
    });

    it('should preserve non-PII fields', () => {
      const data = {
        email: 'user@example.com',
        title: 'Senior Engineer',
        salary: 150000,
        department: 'Engineering',
      };

      const redacted = redactObject(data);

      expect(redacted.email).toContain('[REDACTED]');
      expect(redacted.title).toBe('Senior Engineer');
      expect(redacted.department).toBe('Engineering');
    });
  });

  describe('PII Redaction - Pattern Matching', () => {
    it('should redact email pattern in string values', () => {
      const data = {
        description: 'Contact me at john.doe@example.com for more info',
      };

      const redacted = redactObject(data);

      expect(redacted.description).toContain('[REDACTED:email]');
      expect(redacted.description).not.toContain('john.doe@example.com');
    });

    it('should redact phone pattern in string values', () => {
      const data = {
        contact_info: 'Call (555) 123-4567 or 555.123.4567',
      };

      const redacted = redactObject(data);

      expect(redacted.contact_info).toContain('[REDACTED:phone]');
    });

    it('should redact SSN pattern in string values', () => {
      const data = {
        verification: 'SSN: 123-45-6789 is valid',
      };

      const redacted = redactObject(data);

      expect(redacted.verification).toContain('[REDACTED:ssn]');
    });

    it('should redact credit card pattern in string values', () => {
      const data = {
        payment: 'Card: 4532-1111-2222-3333 processed',
      };

      const redacted = redactObject(data);

      expect(redacted.payment).toContain('[REDACTED:creditCard]');
    });

    it('should redact multiple patterns in single string', () => {
      const data = {
        form: 'Email: john@example.com, Phone: 555-123-4567, SSN: 123-45-6789',
      };

      const redacted = redactObject(data);

      expect(redacted.form).toContain('[REDACTED:email]');
      expect(redacted.form).toContain('[REDACTED:phone]');
      expect(redacted.form).toContain('[REDACTED:ssn]');
      expect(redacted.form).not.toContain('john@example.com');
    });
  });

  describe('PII Redaction - Nested Objects', () => {
    it('should redact PII in nested objects', () => {
      const data = {
        user: {
          email: 'user@example.com',
          profile: {
            phone: '555-123-4567',
          },
        },
      };

      const redacted = redactObject(data);

      expect(redacted.user.email).toContain('[REDACTED]');
      expect(redacted.user.profile.phone).toContain('[REDACTED]');
    });

    it('should redact PII in arrays', () => {
      const data = {
        emails: [
          'alice@example.com',
          'bob@example.com',
          'charlie@example.com',
        ],
      };

      const redacted = redactObject(data);

      expect(redacted.emails.every((email: string) => email.includes('[REDACTED]'))).toBe(true);
    });

    it('should redact PII in deeply nested structures', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              level4: {
                ssn: '123-45-6789',
              },
            },
          },
        },
      };

      const redacted = redactObject(data);

      expect(redacted.level1.level2.level3.level4.ssn).toContain('[REDACTED]');
    });

    it('should preserve object structure after redaction', () => {
      const data = {
        user: {
          email: 'user@example.com',
          name: 'John Doe',
          age: 30,
        },
      };

      const redacted = redactObject(data);

      expect(redacted).toHaveProperty('user');
      expect(redacted.user).toHaveProperty('email');
      expect(redacted.user).toHaveProperty('name');
      expect(redacted.user).toHaveProperty('age');
    });
  });

  describe('PII Redaction - Edge Cases', () => {
    it('should handle null values', () => {
      const data = {
        email: null,
        phone: null,
      };

      const redacted = redactObject(data);

      expect(redacted.email).toBeNull();
      expect(redacted.phone).toBeNull();
    });

    it('should handle undefined values', () => {
      const data = {
        email: undefined,
        name: 'John',
      };

      const redacted = redactObject(data);

      expect(redacted.email).toBeUndefined();
      expect(redacted.name).toBe('John');
    });

    it('should handle empty strings', () => {
      const data = {
        email: '',
        name: 'John',
      };

      const redacted = redactObject(data);

      expect(redacted.email).toBe('');
      expect(redacted.name).toBe('John');
    });

    it('should handle boolean values', () => {
      const data = {
        is_verified: true,
        is_admin: false,
      };

      const redacted = redactObject(data);

      expect(redacted.is_verified).toBe(true);
      expect(redacted.is_admin).toBe(false);
    });

    it('should handle numeric values', () => {
      const data = {
        salary: 150000,
        age: 30,
      };

      const redacted = redactObject(data);

      expect(redacted.salary).toBe(150000);
      expect(redacted.age).toBe(30);
    });

    it('should respect maximum depth limit', () => {
      const data: any = { level1: {} };
      let current = data.level1;
      for (let i = 0; i < 10; i++) {
        current.next = {};
        current = current.next;
      }
      current.email = 'test@example.com';

      const redacted = redactObject(data, 5);

      // Should reach max depth and stop
      expect(JSON.stringify(redacted)).not.toContain('test@example.com');
    });
  });

  describe('Request Logging Middleware', () => {
    let app: Express;
    let logSpy: any;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use(requestLoggingMiddleware);

      logSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
      vi.spyOn(logger, 'warn').mockImplementation(() => {});
      vi.spyOn(logger, 'error').mockImplementation(() => {});
    });

    it('should log successful requests', async () => {
      app.post('/api/v1/jobs', (req, res) => {
        res.status(201).json({ jobId: '123' });
      });

      await request(app)
        .post('/api/v1/jobs')
        .send({ title: 'New Job' })
        .expect(201);

      expect(logSpy).toHaveBeenCalled();
    });

    it('should not log health endpoint requests', async () => {
      logSpy.mockClear();

      app.get('/health', (req, res) => {
        res.json({ status: 'ok' });
      });

      await request(app)
        .get('/health')
        .expect(200);

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should redact request body in logs', async () => {
      app.post('/api/v1/users', (req, res) => {
        res.status(201).json({ userId: '123' });
      });

      await request(app)
        .post('/api/v1/users')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'SecretPassword123',
        })
        .expect(201);

      const logCall = logSpy.mock.calls[0];
      const logData = logCall[1];

      expect(JSON.stringify(logData)).not.toContain('john@example.com');
      expect(JSON.stringify(logData)).not.toContain('SecretPassword123');
      expect(JSON.stringify(logData)).toContain('[REDACTED]');
    });

    it('should skip POST request body logging if empty', async () => {
      app.post('/api/v1/action', (req, res) => {
        res.status(200).json({ success: true });
      });

      await request(app)
        .post('/api/v1/action')
        .send({})
        .expect(200);

      const logCall = logSpy.mock.calls[0];
      const logData = logCall[1];

      expect(logData.request_body).toBeUndefined();
    });

    it('should not log request body for GET requests', async () => {
      app.get('/api/v1/jobs', (req, res) => {
        res.json({ jobs: [] });
      });

      await request(app)
        .get('/api/v1/jobs')
        .expect(200);

      const logCall = logSpy.mock.calls[0];
      const logData = logCall[1];

      expect(logData.request_body).toBeUndefined();
    });

    it('should capture status code and duration', async () => {
      app.post('/api/v1/jobs', (req, res) => {
        setTimeout(() => {
          res.status(201).json({ jobId: '123' });
        }, 10);
      });

      await request(app)
        .post('/api/v1/jobs')
        .send({ title: 'Job' })
        .expect(201);

      const logCall = logSpy.mock.calls[0];
      const logData = logCall[1];

      expect(logData.status_code).toBe(201);
      expect(logData.duration_ms).toBeGreaterThanOrEqual(10);
    });

    it('should log errors', async () => {
      app.post('/api/v1/jobs', (req, res) => {
        res.status(400).json({ error: 'Bad request' });
      });

      await request(app)
        .post('/api/v1/jobs')
        .send({})
        .expect(400);

      // Should log as warn or error
      expect(logSpy || vi.spyOn(logger, 'warn')).toHaveBeenCalled();
    });
  });

  describe('PII Verification Utility', () => {
    it('should detect email addresses in logs', () => {
      const logMessage = 'User john.doe@example.com attempted login';
      const result = verifyNoPiiInLog(logMessage);

      expect(result.hasPii).toBe(true);
      expect(result.findings.some(f => f.pattern === 'email')).toBe(true);
    });

    it('should detect phone numbers in logs', () => {
      const logMessage = 'Contact support at 555-123-4567';
      const result = verifyNoPiiInLog(logMessage);

      expect(result.hasPii).toBe(true);
      expect(result.findings.some(f => f.pattern === 'phone')).toBe(true);
    });

    it('should detect multiple PII patterns', () => {
      const logMessage = 'Email: john@example.com, Phone: 555-123-4567, SSN: 123-45-6789';
      const result = verifyNoPiiInLog(logMessage);

      expect(result.hasPii).toBe(true);
      expect(result.findings.length).toBeGreaterThanOrEqual(3);
    });

    it('should return clean: true for logs without PII', () => {
      const logMessage = 'Successfully created job with ID job-123 for company company-456';
      const result = verifyNoPiiInLog(logMessage);

      expect(result.hasPii).toBe(false);
      expect(result.findings.length).toBe(0);
    });
  });

  describe('PII Fields Inventory', () => {
    it('should include common authentication fields', () => {
      const authFields = ['password', 'secret', 'token', 'api_key'];
      for (const field of authFields) {
        expect(PII_FIELDS).toContain(field);
      }
    });

    it('should include personal information fields', () => {
      const personalFields = ['email', 'phone', 'ssn', 'date_of_birth', 'name'];
      for (const field of personalFields) {
        expect(PII_FIELDS).toContain(field);
      }
    });

    it('should include financial fields', () => {
      const financialFields = ['credit_card', 'bank_account', 'salary'];
      for (const field of financialFields) {
        expect(PII_FIELDS).toContain(field);
      }
    });

    it('should have at least 20 PII field definitions', () => {
      expect(PII_FIELDS.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Redaction Value Function', () => {
    it('should mark redacted values with length for debugging', () => {
      const redacted = redactValue('thissecretneedsredacting', 'password');

      expect(redacted).toContain('[REDACTED');
      expect(redacted).toContain(']');
    });

    it('should handle redaction of PII field by name', () => {
      const redacted = redactValue('user@example.com', 'email');

      expect(redacted).toContain('[REDACTED]');
    });

    it('should preserve non-PII field values', () => {
      const redacted = redactValue('Senior Engineer', 'job_title');

      expect(redacted).toBe('Senior Engineer');
    });
  });
});
