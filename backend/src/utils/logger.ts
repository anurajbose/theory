import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import { trace } from '@opentelemetry/api';
import { getContext } from '../core/als';

const isProd = process.env.NODE_ENV === 'production';

/** Injects request/tenant/trace correlation into every log line. */
const correlation = winston.format((info) => {
  const ctx = getContext();
  if (ctx) {
    info.requestId = ctx.requestId;
    if (!ctx.bypassTenant) info.tenantId = ctx.tenantId;
    info.userId = ctx.userId;
  }
  const span = trace.getActiveSpan();
  if (span) {
    const sc = span.spanContext();
    info.traceId = sc.traceId;
    info.spanId = sc.spanId;
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    correlation(),
    winston.format.json(),
  ),
  defaultMeta: { service: process.env.OTEL_SERVICE_NAME || 'theory-api' },
  transports: [
    new winston.transports.Console({
      format: isProd
        ? winston.format.json()
        : winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

/** Structured access log — one line per request, with latency + correlation. */
export function httpLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info('http_request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(ms * 100) / 100,
      ip: req.ip,
    });
  });
  next();
}

export default logger;
