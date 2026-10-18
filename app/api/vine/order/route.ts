import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logError } from '../../../../lib/logger.js';
import { runRecommendationFromOrderContext } from '../../../../lib/vine/run-recommendation.js';
import { buildPrismaWorld } from '../../../../lib/adapters/runtime/world.prisma.js';
import type { OrderContext } from '../../../../lib/vine/order-context.js';
import { mapTerminalEventToOrderContext } from '../../../../lib/vine/order-context.js';
import { OrderContextSchema } from '../../../../lib/schemas/vine.js';
import { VineOrderSource } from '../../../../lib/enums.js';
import { vineTerminalEventSchema } from '../../../../lib/schemas/vine-terminal.js';
import { isValidMcc } from '../../../../lib/mcc.js';
import { verifyVineSignature, type VineSignatureContext } from '../../../../lib/vine/security.js';
import { resolveUserContext, assertUserId, logInvariant, isPrismaP2003 } from '../../../../lib/user-context.js';
import { parseJsonBody } from '../../../../lib/validation.js';
import { z } from 'zod';
import { asAppError, isUnauthorized, asLogMeta } from '../../../../lib/errors.js';
import { auth } from '../../../../lib/auth.js';
import { getServerConfig } from '../../../../lib/config/store.js';

const VinePayloadSchema = z.union([vineTerminalEventSchema, OrderContextSchema]);
const hasText = (value?: string | null): value is string =>
  value !== undefined && value !== null && value !== '';
const VINE_FAILURE_HEADERS = { 'Cache-Control': 'no-store' } as const;

type VinePayload = z.infer<typeof VinePayloadSchema>;
type TerminalPayload = Extract<VinePayload, { amount: unknown }>;
type DirectPayload = Exclude<VinePayload, TerminalPayload>;
type ServerConfig = ReturnType<typeof getServerConfig>;
type UserMode = Awaited<ReturnType<typeof resolveUserContext>>['mode'];

function parseTimestamp(value?: string | null): number {
  return hasText(value) ? Date.parse(value) : Number.NaN;
}

function parseMccCode(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function terminalTimestamp(body: TerminalPayload, requestTimestampMs: number): number {
  const parsedTimestampUtc = parseTimestamp(body.timestampUtc);
  const parsedTimestamp = Number.isFinite(parsedTimestampUtc)
    ? parsedTimestampUtc
    : parseTimestamp(body.timestampLocal);
  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : requestTimestampMs;
}

function fromTerminalEvent(body: TerminalPayload, requestTimestampMs: number): OrderContext {
  return mapTerminalEventToOrderContext({
    amountCents: Math.round(body.amount),
    currency: body.currency ?? 'USD',
    merchantName: body.merchant?.merchantName ?? null,
    storeId: body.merchant?.storeId ?? null,
    terminalId: body.terminal?.terminalId ?? null,
    mccCode: parseMccCode(body.merchant?.mcc ?? body.mcc),
    timestamp: terminalTimestamp(body, requestTimestampMs),
    deviceId: body.terminal?.terminalId ?? 'VINE-SIM',
    orderId: body.vine?.sessionId ?? null,
    nonce: null,
    source: body.vine?.source ?? VineOrderSource.VINE_SIM,
  }, { fallbackTimestampMs: requestTimestampMs });
}

function trimmedField<K extends string>(key: K, value?: string | null): { [P in K]?: string } {
  return (hasText(value) ? { [key]: value.trim() } : {}) as { [P in K]?: string };
}

function fromDirectPayload(body: DirectPayload, requestTimestampMs: number): OrderContext {
  return {
    deviceId: hasText(body.deviceId) ? body.deviceId.trim() : 'VINE-SIM',
    amountCents: Math.floor(body.amountCents as number),
    currency: 'USD',
    timestamp: Number.isFinite(body.timestamp) ? body.timestamp : requestTimestampMs,
    source: body.source ?? VineOrderSource.VINE_SIM,
    ...trimmedField('storeId', body.storeId),
    ...trimmedField('terminalId', body.terminalId),
    ...trimmedField('orderId', body.orderId),
    ...trimmedField('merchantName', body.merchantName),
    ...(body.mccCode != null ? { mccCode: body.mccCode } : {}),
    ...trimmedField('nonce', body.nonce),
  };
}

function toOrderContext(body: VinePayload, requestTimestampMs: number): OrderContext {
  return 'amount' in body
    ? fromTerminalEvent(body, requestTimestampMs)
    : fromDirectPayload(body, requestTimestampMs);
}

function signatureModeFailure(serverConfig: ServerConfig, requestId: string | null): NextResponse | null {
  if (serverConfig.environment !== 'production' || serverConfig.vineSignatureMode === 'enforce') {
    return null;
  }
  logInvariant('Invalid Vine signature mode in production', {
    endpoint: 'api/vine/order',
    mode: serverConfig.vineSignatureMode,
    environment: serverConfig.environment,
    deviceId: null,
    requestId,
  });
  return NextResponse.json(
    {
      error: 'Invalid server configuration',
      code: 'VINE_SIGNATURE_MODE_INVALID',
    },
    { status: 500, headers: VINE_FAILURE_HEADERS }
  );
}

function orderContextFailure(orderContext: OrderContext, requestTimestampMs: number): NextResponse | null {
  if (orderContext.mccCode != null && !isValidMcc(orderContext.mccCode)) {
    return NextResponse.json({ error: 'MCC must be a valid merchant category code' }, { status: 400 });
  }

  const ageMs = requestTimestampMs - orderContext.timestamp;
  const maxAgeMs = 3 * 60 * 1000; // TODO: tune freshness window
  if (ageMs > maxAgeMs) {
    return NextResponse.json(
      { error: 'stale_order', ageMs },
      { status: 400 }
    );
  }
  return null;
}

async function signatureFailure(
  request: NextRequest,
  orderContext: OrderContext,
  meta: { serverConfig: ServerConfig; requestId: string | null }
): Promise<NextResponse | null> {
  const signatureHeader = request.headers.get('x-vine-signature');
  const sigCtx: VineSignatureContext = {
    deviceId: orderContext.deviceId,
    amountCents: orderContext.amountCents,
    currency: orderContext.currency ?? 'USD',
    timestamp: orderContext.timestamp,
    storeId: orderContext.storeId ?? null,
    terminalId: orderContext.terminalId ?? null,
    orderId: orderContext.orderId ?? null,
  };
  const sigResult = await verifyVineSignature(sigCtx, signatureHeader);
  if (sigResult.ok === true) return null;
  logInvariant('Invalid Vine signature', {
    endpoint: 'api/vine/order',
    mode: sigResult.mode,
    environment: meta.serverConfig.environment,
    deviceId: orderContext.deviceId,
    reason: sigResult.reason ?? null,
    requestId: meta.requestId,
  });
  return NextResponse.json(
    { error: 'Invalid signature', code: 'VINE_SIGNATURE_INVALID' },
    { status: 403, headers: VINE_FAILURE_HEADERS }
  );
}

async function recommend(
  orderContext: OrderContext,
  user: { userId: string; mode: UserMode },
  now: Date
): Promise<NextResponse> {
  const { userId, mode } = user;
  try {
    const world = buildPrismaWorld();
    const result = await runRecommendationFromOrderContext(world, orderContext, userId, { now });

    return NextResponse.json({
      sessionId: result.sessionId,
      decision: result.decision,
      orderToken: result.orderToken,
      authority: result.authority,
    });
  } catch (err: unknown) {
    const appError = asAppError(err);
    if (isPrismaP2003(err)) {
      logInvariant('P2003 in api/vine/order POST', {
        userId,
        mode,
        meta: asLogMeta(err.meta),
        err,
      });
    } else {
      logInvariant('Error in api/vine/order POST', { userId, mode, err: appError });
    }
    return NextResponse.json({ error: 'User context or FK error' }, { status: 500 });
  }
}

function unexpectedFailure(error: unknown): NextResponse {
  const appError = asAppError(error);
  if (isUnauthorized(appError)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  logError('Error in /api/vine/order', appError);
  return NextResponse.json({ error: 'Failed to process order' }, { status: 500 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestReceivedAt = new Date();
  const requestTimestampMs = requestReceivedAt.getTime();
  const serverConfig = getServerConfig();
  const requestId = request.headers.get('x-request-id');
  const modeFailure = signatureModeFailure(serverConfig, requestId);
  if (modeFailure !== null) return modeFailure;
  try {
    const { userId, mode } = await resolveUserContext({
      getSession: auth,
      requireAuth: false,
      allowLabDemo: true,
    });
    assertUserId(userId, 'api/vine/order POST');
    const parsedPayload = await parseJsonBody(request, VinePayloadSchema);
    if (parsedPayload.ok !== true) return parsedPayload.response;

    const orderContext = toOrderContext(parsedPayload.data, requestTimestampMs);
    const failure =
      orderContextFailure(orderContext, requestTimestampMs) ??
      (await signatureFailure(request, orderContext, { serverConfig, requestId }));
    if (failure !== null) return failure;

    return await recommend(orderContext, { userId, mode }, requestReceivedAt);
  } catch (error: unknown) {
    return unexpectedFailure(error);
  }
}
