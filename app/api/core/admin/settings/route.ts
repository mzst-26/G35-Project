import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { proxyCoreRequest } from '@/lib/core/proxy';
import { withSessionBridge } from '@/lib/auth/session-bridge';
import { enforceCoreRouteGuard } from '@/lib/auth/core-route-guard';

const generalSettingsSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phoneNumber: z.string(),
  adminLevel: z.string().min(1),
}).strict();

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  newUserAlerts: z.boolean(),
  appealAlerts: z.boolean(),
  supportTicketAlerts: z.boolean(),
  systemAlerts: z.boolean(),
}).strict();

const paymentSettingsSchema = z.object({
  platformFeePercent: z.number().min(0).max(100).nullable(),
  lateCancellationFee: z.number().min(0).nullable(),
  noShowFee: z.number().min(0).nullable(),
  lateArrivalFee: z.number().min(0).nullable(),
}).strict();

const jobSettingsSchema = z.object({
  maxJobsPerTrade: z.number().int().min(0).nullable(),
  jobCancellationWindowHours: z.number().int().min(0).nullable(),
}).strict();

const userSettingsSchema = z.object({
  autoSuspensionThreshold: z.number().int().min(0).nullable(),
}).strict();

const adminSettingsUpdateSchema = z.object({
  general: generalSettingsSchema,
  notifications: notificationSettingsSchema,
  payments: paymentSettingsSchema,
  jobs: jobSettingsSchema,
  users: userSettingsSchema,
}).strict();

function parseSettingsPayload(payload: unknown): z.infer<typeof adminSettingsUpdateSchema> | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const root = payload as Record<string, unknown>;
  const source =
    root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;

  const parsed = adminSettingsUpdateSchema.safeParse(source);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

function buildRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || `req-${crypto.randomUUID()}`;
}

function createJsonError(
  requestId: string,
  status: number,
  code: string,
  message: string,
  issues?: Array<{ field: string; message: string }>,
): NextResponse {
  return new NextResponse(JSON.stringify({
    code,
    message,
    requestId,
    timestamp: new Date().toISOString(),
    issues,
  }), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const guardError = enforceCoreRouteGuard(request, {
    route: '/api/core/admin/settings',
    allowedRoles: ['admin'],
    rateLimitProfile: 'admin',
  });
  if (guardError) {
    return guardError;
  }

  return withSessionBridge(request, async () => {
    return proxyCoreRequest(request, {
      endpoint: '/api/v1/admin/settings',
    });
  });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const guardError = enforceCoreRouteGuard(request, {
    route: '/api/core/admin/settings',
    allowedRoles: ['admin'],
    rateLimitProfile: 'admin',
  });
  if (guardError) {
    return guardError;
  }

  return withSessionBridge(request, async () => {
    const requestId = buildRequestId(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createJsonError(
        requestId,
        400,
        'INVALID_JSON',
        'Request body must be valid JSON',
      );
    }

    const validation = adminSettingsUpdateSchema.safeParse(body);
    if (!validation.success) {
      return createJsonError(
        requestId,
        400,
        'CLIENT_VALIDATION_ERROR',
        'Request validation failed',
        validation.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }

    const currentSettingsResponse = await proxyCoreRequest(request, {
      endpoint: '/api/v1/admin/settings',
      method: 'GET',
    });

    if (!currentSettingsResponse.ok) {
      return createJsonError(
        requestId,
        503,
        'ADMIN_SETTINGS_BASELINE_UNAVAILABLE',
        'Unable to verify immutable admin fields right now.',
      );
    }

    const currentBodyText = await currentSettingsResponse.text();
    let currentPayload: unknown = null;
    try {
      currentPayload = currentBodyText ? JSON.parse(currentBodyText) : null;
    } catch {
      currentPayload = null;
    }

    const currentSettings = parseSettingsPayload(currentPayload);
    if (!currentSettings) {
      return createJsonError(
        requestId,
        503,
        'ADMIN_SETTINGS_BASELINE_INVALID',
        'Unable to validate immutable admin fields right now.',
      );
    }

    const incoming = validation.data;
    const immutableFieldChanged =
      incoming.general.fullName !== currentSettings.general.fullName ||
      incoming.general.email !== currentSettings.general.email ||
      incoming.general.phoneNumber !== currentSettings.general.phoneNumber ||
      incoming.general.adminLevel !== currentSettings.general.adminLevel;

    if (immutableFieldChanged) {
      return createJsonError(
        requestId,
        403,
        'IMMUTABLE_ADMIN_FIELDS',
        'Admin profile fields are read-only and cannot be changed from this panel.',
      );
    }

    return proxyCoreRequest(request, {
      endpoint: '/api/v1/admin/settings',
      method: 'PATCH',
    });
  });
}
