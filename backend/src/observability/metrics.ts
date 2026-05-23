import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

export const registry = new client.Registry();
registry.setDefaultLabels({ service: process.env.OTEL_SERVICE_NAME || 'theory-api' });
client.collectDefaultMetrics({ register: registry });

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

const httpTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
});

/** Times every request; uses the route pattern (not raw path) to bound cardinality. */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = (req.route?.path && req.baseUrl + req.route.path) || req.path || 'unknown';
    const labels = { method: req.method, route, status: String(res.statusCode) };
    end(labels);
    httpTotal.inc(labels);
  });
  next();
}

export async function metricsHandler(_req: Request, res: Response): Promise<void> {
  res.setHeader('Content-Type', registry.contentType);
  res.send(await registry.metrics());
}
