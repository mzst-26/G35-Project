import { describe, expect, it } from 'vitest';

import { EMAIL_MAX_LENGTH, EMAIL_REGEX, isValidEmail } from '@/lib/validation/email';

describe('email validation', () => {
  describe('EMAIL_MAX_LENGTH', () => {
    it('is 254 per RFC 5321', () => {
      expect(EMAIL_MAX_LENGTH).toBe(254);
    });
  });

  describe('EMAIL_REGEX', () => {
    it('matches a standard email', () => {
      expect(EMAIL_REGEX.test('user@example.com')).toBe(true);
    });

    it('rejects an address without @', () => {
      expect(EMAIL_REGEX.test('userexample.com')).toBe(false);
    });

    it('rejects an address without a dot in the domain', () => {
      expect(EMAIL_REGEX.test('user@examplecom')).toBe(false);
    });

    it('rejects whitespace in local part', () => {
      expect(EMAIL_REGEX.test('us er@example.com')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('accepts a standard email', () => {
      expect(isValidEmail('person@example.com')).toBe(true);
    });

    it('accepts an email with subdomains', () => {
      expect(isValidEmail('user@mail.corp.example.com')).toBe(true);
    });

    it('accepts an email with plus addressing', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('trims and lowercases before validation', () => {
      expect(isValidEmail('  User@Example.COM  ')).toBe(true);
    });

    it('rejects an empty string', () => {
      expect(isValidEmail('')).toBe(false);
    });

    it('rejects whitespace-only input', () => {
      expect(isValidEmail('   ')).toBe(false);
    });

    it('rejects input without @', () => {
      expect(isValidEmail('userexample.com')).toBe(false);
    });

    it('rejects input without a domain dot', () => {
      expect(isValidEmail('user@examplecom')).toBe(false);
    });

    it('rejects an address exceeding EMAIL_MAX_LENGTH', () => {
      const longLocal = 'a'.repeat(EMAIL_MAX_LENGTH);
      expect(isValidEmail(`${longLocal}@example.com`)).toBe(false);
    });

    it('accepts an address exactly at the length limit', () => {
      const domain = '@e.co';
      const local = 'a'.repeat(EMAIL_MAX_LENGTH - domain.length);
      expect(isValidEmail(`${local}${domain}`)).toBe(true);
    });

    it('rejects non-string input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidEmail(null as any)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidEmail(undefined as any)).toBe(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(isValidEmail(42 as any)).toBe(false);
    });
  });
});
