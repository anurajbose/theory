import { Request, Response, NextFunction } from 'express';
import { getContext } from './als';

/**
 * Response normaliser. Every /api response becomes { success, data, meta, error }
 * WITHOUT touching legacy controllers. Controllers already using ok()/fail()
 * emit the envelope directly and pass straight through (idempotent).
 *
 * This makes the entire surface contract-compliant immediately; per-controller
 * Zod hardening then proceeds incrementally and safely.
 */
function isEnveloped(b: unknown): boolean {
  return (
    !!b &&
    typeof b === 'object' &&
    'success' in (b as object) &&
    'error' in (b as object) &&
    'data' in (b as object)
  );
}

const STATUS_CODE: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION',
  429: 'RATE_LIMITED',
  500: 'INTERNAL',
};

export function envelope(req: Request, res: Response, next: NextFunction): void {
  const original = res.json.bind(res);
  res.json = (body: unknown) => {
    if (isEnveloped(body)) return original(body);

    const requestId = getContext()?.requestId ?? req.requestId;
    const status = res.statusCode || 200;

    if (status < 400) {
      return original({ success: true, data: body ?? null, meta: { requestId }, error: null });
    }

    const b = (body ?? {}) as Record<string, unknown>;
    const message =
      (typeof b.error === 'string' && b.error) ||
      (typeof b.message === 'string' && b.message) ||
      'Request failed';
    return original({
      success: false,
      data: null,
      meta: { requestId },
      error: { code: STATUS_CODE[status] ?? 'ERROR', message, details: b.details ?? null },
    });
  };
  next();
}
