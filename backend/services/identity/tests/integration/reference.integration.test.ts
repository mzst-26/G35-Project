import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';

vi.mock('../../src/supabase/index.js', () => ({
  createServiceRoleClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(),
  }),
  createAnonClient: () => ({
    auth: {
      verifyOtp: vi.fn(),
      refreshSession: vi.fn(),
    },
  }),
  createServerClient: () => ({ auth: { getUser: vi.fn() } }),
}));

describe('reference routes integration', () => {
  beforeEach(() => {
    process.env.COMPANIES_HOUSE_API_KEY = 'test-ch-key';
  });

  it('returns UK company lookup results from identity route', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              company_name: 'NOVA OUTLINE LTD',
              company_number: '12345678',
              address_snippet: '10 Fleet Street, London, England',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ) as unknown as Response,
    );

    const app = createApp();
    const response = await request(app).get('/api/reference/uk-companies?q=nova');

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([
      {
        companyName: 'NOVA OUTLINE LTD',
        companyNumber: '12345678',
        addressLine1: '10 Fleet Street',
      },
    ]);

    fetchMock.mockRestore();
  });

  it('returns validation error for short query', async () => {
    const app = createApp();
    const response = await request(app).get('/api/reference/uk-companies?q=n');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
  });
});
