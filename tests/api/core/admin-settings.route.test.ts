import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, PATCH } from '../../../app/api/core/admin/settings/route';
import { proxyCoreRequest } from '../../../lib/core/proxy';
import { withSessionBridge } from '../../../lib/auth/session-bridge';

vi.mock('../../../lib/core/proxy', () => ({
  proxyCoreRequest: vi.fn(),
}));

vi.mock('../../../lib/auth/session-bridge', () => ({
  withSessionBridge: vi.fn(),
}));

type MockedFn = ReturnType<typeof vi.fn>;

function createValidPayload() {
  return {
    general: {
      fullName: 'G35 Admin',
      email: 'platform@g35.test',
      phoneNumber: '+441234567890',
      adminLevel: 'super',
    },
    notifications: {
      emailNotifications: true,
      newUserAlerts: true,
      appealAlerts: true,
      supportTicketAlerts: true,
      systemAlerts: true,
    },
    payments: {
      platformFeePercent: 12,
      lateCancellationFee: 100,
      noShowFee: 120,
      lateArrivalFee: 50,
    },
    jobs: {
      maxJobsPerTrade: 5,
      jobCancellationWindowHours: 24,
    },
    users: {
      autoSuspensionThreshold: 3,
    },
  };
}

describe('app/api/core/admin/settings/route.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('proxies admin settings read via session bridge', async () => {
    const proxied = new NextResponse(JSON.stringify({ data: {} }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    (proxyCoreRequest as MockedFn).mockResolvedValueOnce(proxied);
    (withSessionBridge as MockedFn).mockImplementationOnce(
      async (_request: NextRequest, handler: () => Promise<NextResponse>) => handler(),
    );

    const request = new NextRequest('http://localhost:3000/api/core/admin/settings');
    const response = await GET(request);

    expect(withSessionBridge).toHaveBeenCalledTimes(1);
    expect(proxyCoreRequest).toHaveBeenCalledWith(request, {
      endpoint: '/api/v1/admin/settings',
    });
    expect(response.status).toBe(200);
  });

  it('returns session bridge response on GET auth failure path', async () => {
    const unauthorized = new NextResponse(JSON.stringify({ code: 'UNAUTHORIZED' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });

    (withSessionBridge as MockedFn).mockResolvedValueOnce(unauthorized);

    const request = new NextRequest('http://localhost:3000/api/core/admin/settings');
    const response = await GET(request);

    expect(proxyCoreRequest).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid PATCH JSON and does not proxy', async () => {
    (withSessionBridge as MockedFn).mockImplementationOnce(
      async (_request: NextRequest, handler: () => Promise<NextResponse>) => handler(),
    );

    const request = new NextRequest('http://localhost:3000/api/core/admin/settings', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: '{invalid-json',
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('INVALID_JSON');
    expect(proxyCoreRequest).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid PATCH payload and does not proxy', async () => {
    (withSessionBridge as MockedFn).mockImplementationOnce(
      async (_request: NextRequest, handler: () => Promise<NextResponse>) => handler(),
    );

    const invalidPayload = createValidPayload();
    invalidPayload.general.email = 'not-an-email';

    const request = new NextRequest('http://localhost:3000/api/core/admin/settings', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(invalidPayload),
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe('CLIENT_VALIDATION_ERROR');
    expect(proxyCoreRequest).not.toHaveBeenCalled();
  });

  it('proxies valid PATCH payload via session bridge', async () => {
    const baseline = new NextResponse(JSON.stringify({ data: createValidPayload() }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    const proxied = new NextResponse(JSON.stringify({ data: {} }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    (proxyCoreRequest as MockedFn)
      .mockResolvedValueOnce(baseline)
      .mockResolvedValueOnce(proxied);
    (withSessionBridge as MockedFn).mockImplementationOnce(
      async (_request: NextRequest, handler: () => Promise<NextResponse>) => handler(),
    );

    const request = new NextRequest('http://localhost:3000/api/core/admin/settings', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(createValidPayload()),
    });

    const response = await PATCH(request);

    expect(proxyCoreRequest).toHaveBeenNthCalledWith(1, request, {
      endpoint: '/api/v1/admin/settings',
      method: 'GET',
    });
    expect(proxyCoreRequest).toHaveBeenNthCalledWith(2, request, {
      endpoint: '/api/v1/admin/settings',
      method: 'PATCH',
    });
    expect(response.status).toBe(200);
  });

  it('returns 403 when immutable admin fields are changed in PATCH payload', async () => {
    const baselinePayload = createValidPayload();
    const baseline = new NextResponse(JSON.stringify({ data: baselinePayload }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    (proxyCoreRequest as MockedFn).mockResolvedValueOnce(baseline);
    (withSessionBridge as MockedFn).mockImplementationOnce(
      async (_request: NextRequest, handler: () => Promise<NextResponse>) => handler(),
    );

    const changed = createValidPayload();
    changed.general.phoneNumber = '+449999999999';

    const request = new NextRequest('http://localhost:3000/api/core/admin/settings', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(changed),
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(proxyCoreRequest).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(403);
    expect(body.code).toBe('IMMUTABLE_ADMIN_FIELDS');
  });

  it('returns session bridge response on PATCH auth failure path', async () => {
    const unauthorized = new NextResponse(JSON.stringify({ code: 'UNAUTHORIZED' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });

    (withSessionBridge as MockedFn).mockResolvedValueOnce(unauthorized);

    const request = new NextRequest('http://localhost:3000/api/core/admin/settings', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(createValidPayload()),
    });

    const response = await PATCH(request);

    expect(proxyCoreRequest).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it('returns 403 for recruiter role on admin settings GET', async () => {
    const request = new NextRequest('http://localhost:3000/api/core/admin/settings', {
      headers: {
        'x-user-role': 'recruiter',
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe('FORBIDDEN');
    expect(withSessionBridge).not.toHaveBeenCalled();
    expect(proxyCoreRequest).not.toHaveBeenCalled();
  });
});
