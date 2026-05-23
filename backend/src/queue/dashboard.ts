import { Router, Request, Response, NextFunction } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { ALL_QUEUES, getQueue, dlqName, QueueName } from './queues';
import logger from '../utils/logger';

/**
 * Queue monitoring UI. DISABLED unless ENABLE_QUEUE_DASHBOARD=true, and then
 * gated by a shared token (browser UI can't carry our bearer JWT). Production:
 * additionally restrict via VPN / SSO proxy / network policy.
 */
export function buildQueueDashboard(): Router | null {
  if (process.env.ENABLE_QUEUE_DASHBOARD !== 'true') return null;

  const token = process.env.QUEUE_DASHBOARD_TOKEN;
  if (!token) {
    logger.warn('Queue dashboard requested but QUEUE_DASHBOARD_TOKEN unset → staying disabled');
    return null;
  }

  const gate = (req: Request, res: Response, next: NextFunction) => {
    const provided = (req.query.token as string) || req.headers['x-queue-token'];
    if (provided !== token) {
      res.status(401).json({
        success: false, data: null, meta: {},
        error: { code: 'UNAUTHENTICATED', message: 'Queue dashboard token required', details: null },
      });
      return;
    }
    next();
  };

  const adapter = new ExpressAdapter();
  adapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [
      ...ALL_QUEUES.map((q) => new BullMQAdapter(getQueue(q))),
      ...ALL_QUEUES.map((q) => new BullMQAdapter(getQueue(dlqName(q as QueueName)))),
    ],
    serverAdapter: adapter,
  });

  const router = Router();
  router.use('/admin/queues', gate, adapter.getRouter());
  logger.info('queue_dashboard_enabled', { path: '/admin/queues' });
  return router;
}
