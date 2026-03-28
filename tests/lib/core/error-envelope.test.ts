import { describe, expect, it } from 'vitest';

import {
  HookApiError,
  parseJsonOrThrowEnvelope,
  toHookApiError,
} from '@/lib/core/error-envelope';

describe('error-envelope utility', () => {
  it('returns parsed body for successful JSON response', async () => {
    const response = new Response(JSON.stringify({ items: [{ id: '1' }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    const payload = await parseJsonOrThrowEnvelope<{ items: Array<{ id: string }> }>(
      response,
      'fallback',
      'FALLBACK_CODE',
    );

    expect(payload.items[0].id).toBe('1');
  });

  it('throws HookApiError with envelope details for failed response', async () => {
    const response = new Response(
      JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        requestId: 'req-123',
        timestamp: '2026-03-26T00:00:00.000Z',
      }),
      {
        status: 400,
        headers: { 'content-type': 'application/json' },
      },
    );

    await expect(
      parseJsonOrThrowEnvelope(response, 'fallback', 'FALLBACK_CODE'),
    ).rejects.toMatchObject({
      name: 'HookApiError',
      envelope: {
        code: 'VALIDATION_ERROR',
        requestId: 'req-123',
        status: 400,
      },
    });
  });

  it('uses x-request-id response header when body does not include requestId', async () => {
    const response = new Response(
      JSON.stringify({
        code: 'UPSTREAM_ERROR',
        message: 'Upstream failed',
      }),
      {
        status: 502,
        headers: {
          'content-type': 'application/json',
          'x-request-id': 'req-from-header',
        },
      },
    );

    await expect(
      parseJsonOrThrowEnvelope(response, 'fallback', 'FALLBACK_CODE'),
    ).rejects.toMatchObject({
      name: 'HookApiError',
      envelope: {
        code: 'UPSTREAM_ERROR',
        requestId: 'req-from-header',
        status: 502,
      },
    });
  });

  it('normalizes unknown errors into HookApiError', () => {
    const error = toHookApiError(new Error('Boom'), 'fallback', 'FALLBACK_CODE');

    expect(error).toBeInstanceOf(HookApiError);
    expect(error.envelope.code).toBe('FALLBACK_CODE');
    expect(error.envelope.message).toBe('Boom');
    expect(error.envelope.requestId).toMatch(/^req-/);
  });
});
