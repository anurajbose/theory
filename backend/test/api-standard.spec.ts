import { describe, it, expect } from 'vitest';
import type { Request, Response } from 'express';
import { envelope } from '../src/core/envelope';
import { buildOpenApi } from '../src/core/openapi';
import { registry } from '../src/observability/metrics';

function harness(statusCode = 200) {
  let sent: unknown;
  const res = {
    statusCode,
    json(b: unknown) { sent = b; return this; },
  } as unknown as Response;
  envelope({ requestId: 'rid-1' } as unknown as Request, res, () => {});
  return { res, get: () => sent };
}

describe('response envelope shim', () => {
  it('wraps a success payload', () => {
    const h = harness(200);
    h.res.json({ hello: 'world' });
    expect(h.get()).toEqual({
      success: true,
      data: { hello: 'world' },
      meta: { requestId: 'rid-1' },
      error: null,
    });
  });

  it('is idempotent for already-enveloped bodies', () => {
    const h = harness(200);
    const pre = { success: true, data: 1, meta: {}, error: null };
    h.res.json(pre);
    expect(h.get()).toBe(pre);
  });

  it('maps legacy error bodies by status code', () => {
    const h = harness(401);
    h.res.json({ error: 'Invalid or expired token' });
    expect(h.get()).toEqual({
      success: false,
      data: null,
      meta: { requestId: 'rid-1' },
      error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired token', details: null },
    });
  });

  it('maps 422 to VALIDATION', () => {
    const h = harness(422);
    h.res.json({ message: 'bad input' });
    expect((h.get() as { error: { code: string } }).error.code).toBe('VALIDATION');
  });
});

describe('OpenAPI document (schema-first from Zod)', () => {
  const doc = buildOpenApi() as {
    openapi: string;
    components: { schemas: Record<string, unknown>; securitySchemes: Record<string, { scheme?: string }> };
    paths: Record<string, { get?: { parameters?: unknown[] }; post?: unknown }>;
  };
  it('is OpenAPI 3.1 with Zod-generated envelope components', () => {
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.components.schemas.Meta).toBeDefined();
    expect(doc.components.schemas.ErrorObject).toBeDefined();
    expect(doc.components.schemas.Notification).toBeDefined();
    expect(doc.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
  });
  it('documents auth + notifications with query params from the live Zod schema', () => {
    expect(doc.paths['/api/auth/login'].post).toBeDefined();
    expect(doc.paths['/api/notifications'].get).toBeDefined();
    expect((doc.paths['/api/notifications'].get!.parameters ?? []).length).toBeGreaterThan(0);
  });
});

describe('observability', () => {
  it('tracing module loads no-op when disabled (no throw)', async () => {
    await expect(import('../src/observability/tracing')).resolves.toBeDefined();
  });
  it('prometheus registry exposes default + custom metrics', async () => {
    const out = await registry.metrics();
    expect(out).toContain('process_cpu_user_seconds_total');
    expect(out).toContain('http_request_duration_seconds');
    expect(out).toContain('http_requests_total');
  });
});
