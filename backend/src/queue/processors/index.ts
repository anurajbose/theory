import { Job } from 'bullmq';
import { QueueName } from '../queues';
import { runAsSystem } from '../../core/als';
import { createNotification } from '../../controllers/notificationController';
import { processExport } from '../../core/export/processor';
import { NotificationType } from '@prisma/client';
import logger from '../../utils/logger';

export type Processor = (job: Job) => Promise<unknown>;

interface NotificationJob {
  userId: string;
  type: NotificationType;
  message: string;
  link?: string;
}

/** Canonical, fully-wired processor — proves the end-to-end pattern. */
const notifications: Processor = (job: Job) => {
  const { userId, type, message, link } = job.data as NotificationJob;
  // Outside a request → run as system so the guarded Prisma client passes.
  return runAsSystem(() => createNotification(userId, type, message, link));
};

/** Stub — business logic lands in its dedicated sprint (reports/exports/AI/SLA). */
const stub = (q: string): Processor => async (job: Job) => {
  logger.info('queue_stub_processed', { queue: q, jobId: job.id, name: job.name });
  return { ok: true, stub: true };
};

export const PROCESSORS: Record<QueueName, Processor> = {
  [QueueName.NOTIFICATIONS]: notifications,
  [QueueName.REMINDERS]: stub(QueueName.REMINDERS),
  [QueueName.REPORTS]: stub(QueueName.REPORTS),
  [QueueName.EXPORTS]: (job: Job) => processExport((job.data as { jobId: string }).jobId),
  [QueueName.AI]: stub(QueueName.AI),
  [QueueName.SLA]: stub(QueueName.SLA),
};
