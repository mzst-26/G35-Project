import { describe, expect, it, vi, beforeEach } from 'vitest';
import { coreGetJson, corePatchJson } from '@/lib/core/client';

describe('lib/core/client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds query string for coreGetJson', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ));

    await coreGetJson<{ items: unknown[] }>(
      '/api/core/jobs',
      'Failed to load jobs',
      'JOBS_LOAD_FAILED',
      { limit: 20, assignee: 'self' },
    );

    expect(fetch).toHaveBeenCalledWith(
      '/api/core/jobs?limit=20&assignee=self',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('sends JSON payload for corePatchJson', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ));

    await corePatchJson<{ ok: boolean }, { value: number }>(
      '/api/core/admin/settings',
      { value: 42 },
      'Save failed',
      'SAVE_FAILED',
    );

    expect(fetch).toHaveBeenCalledWith(
      '/api/core/admin/settings',
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: 42 }),
      }),
    );
  });
});
