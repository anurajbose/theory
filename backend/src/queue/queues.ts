import { Queue, JobsOptions } from 'bullmq';
import { connection } from './connection';

/** Every async workload in THEORY flows through one of these. */
export enum QueueName {
  NOTIFICATIONS = 'notifications',
  REMINDERS = 'reminders',
  REPORTS = 'reports',
  EXPORTS = 'exports',
  AI = 'ai',
  SLA = 'sla',
}

export const ALL_QUEUES = Object.values(QueueName);

/** Standard reliability defaults: retries w/ exponential backoff + DLQ. */
export const DEFAULT_JOB_OPTS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: false, // keep failed jobs for inspection until DLQ'd
};

export const dlqName = (q: QueueName | string) => `${q}-dlq`;

const registry = new Map<string, Queue>();

export function getQueue(name: QueueName | string): Queue {
  let q = registry.get(name);
  if (!q) {
    q = new Queue(name, { connection, defaultJobOptions: DEFAULT_JOB_OPTS });
    registry.set(name, q);
  }
  return q;
}

/** Single entrypoint app code uses to schedule async work. */
export function enqueue<T = unknown>(
  name: QueueName,
  jobName: string,
  data: T,
  opts?: JobsOptions,
) {
  return getQueue(name).add(jobName, data as object, opts);
}

/**
 * Resilient enqueue for the request path: never blocks/throws if Redis is
 * unavailable. The row stays PENDING (a reconcile sweep / healthy worker picks
 * it up later) — the API response is never held hostage to Redis.
 */
export async function enqueueSafe<T = unknown>(
  name: QueueName,
  jobName: string,
  data: T,
  opts?: JobsOptions,
): Promise<boolean> {
  if (connection.status !== 'ready') return false;
  try {
    await Promise.race([
      getQueue(name).add(jobName, data as object, opts),
      new Promise((_, r) => setTimeout(() => r(new Error('enqueue timeout')), 500)),
    ]);
    return true;
  } catch {
    return false;
  }
}

export function registeredQueues(): Queue[] {
  return [...registry.values()];
}

export async function closeQueues(): Promise<void> {
  await Promise.all([...registry.values()].map((q) => q.close().catch(() => undefined)));
  registry.clear();
}
