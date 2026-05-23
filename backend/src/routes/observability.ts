import { Router } from 'express';
import { rawPrisma } from '../utils/prisma';
import { metricsHandler } from '../observability/metrics';
import { redisReady } from '../queue/connection';
import logger from '../utils/logger';

const QUEUES_ON = process.env.QUEUES_ENABLED !== 'false';

const router = Router();

/** Liveness — process is up. Cheap, no dependencies. */
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: process.env.OTEL_SERVICE_NAME || 'theory-api', ts: new Date().toISOString() });
});

/** Readiness — can serve traffic (critical deps reachable). */
router.get('/ready', async (_req, res) => {
  const checks: Record<string, 'up' | 'down'> = {};
  try {
    await rawPrisma.$queryRaw`SELECT 1`;
    checks.postgres = 'up';
  } catch (err) {
    checks.postgres = 'down';
    logger.error('readiness: postgres down', err);
  }
  if (QUEUES_ON) {
    checks.redis = (await redisReady()) ? 'up' : 'down';
  }
  const ready = Object.values(checks).every((v) => v === 'up');
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', checks });
});

/** Prometheus scrape target. */
router.get('/metrics', metricsHandler);

export default router;
