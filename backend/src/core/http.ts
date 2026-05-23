import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';
import { getContext } from './als';
import { TenantViolationError, TenantContextError } from '../utils/prisma';

/** Standard application error with HTTP status + machine code. */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export interface Meta {
  requestId?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  [k: string]: unknown;
}

/** { success, data, meta, error } — the only response shape. */
export function ok<T>(res: Response, data: T, meta: Meta = {}, status = 200): void {
  res.status(status).json({
    success: true,
    data,
    meta: { requestId: getContext()?.requestId, ...meta },
    error: null,
  });
}

export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  res.status(status).json({
    success: false,
    data: null,
    meta: { requestId: getContext()?.requestId },
    error: { code, message, details: details ?? null },
  });
}

/** Wrap async controllers so thrown errors reach the central handler. */
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/** Central error middleware — last in the chain. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    fail(res, 422, 'VALIDATION', 'Request validation failed', err.flatten());
    return;
  }
  if (err instanceof TenantViolationError || err instanceof TenantContextError) {
    fail(res, err.status, err.code, err.message);
    return;
  }
  if (err instanceof AppError) {
    fail(res, err.status, err.code, err.message, err.details);
    return;
  }
  logger.error('Unhandled error', err);
  fail(res, 500, 'INTERNAL', 'Internal server error');
}
