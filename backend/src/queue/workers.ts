import { Worker, Queue, Job } from 'bullmq';
import { connection } from './connection';
import { ALL_QUEUES, QueueName, DEFAULT_JOB_OPTS, dlqName } from './queues';
import { PROCESSORS } from './processors';
import logger from '../utils/logger';

const workers: Worker[] = [];
const dlqs = new Map<string, Queue>();
const CONCURRENCY = Number(process.env.QUEUE_CONCURRENCY) || 5;

function dlq(name: string): Queue {
  let q = dlqs.get(name);
  if (!q) {
    q = new Queue(dlqName(name), { connection });
    dlqs.set(name, q);
  }
  return q;
}

/** Starts one Worker per queue. Permanently-failed jobs → dead-letter queue. */
export function startWorkers(): void {
  for (const name of ALL_QUEUES) {
    const w = new Worker(name, PROCESSORS[name as QueueName], {
      connection,
      concurrency: CONCURRENCY,
    });

    w.on('completed', (job) =>
      logger.debug('job_completed', { queue: name, jobId: job.id, name: job.name }),
    );

    w.on('failed', async (job: Job | undefined, err: Error) => {
      const attempts = job?.attemptsMade ?? 0;
      const max = (job?.opts.attempts ?? DEFAULT_JOB_OPTS.attempts) as number;
      logger.error('job_failed', {
        queue: name, jobId: job?.id, attempt: attempts, max, err: err.message,
      });
      if (job && attempts >= max) {
        // Exhausted retries → dead-letter for inspection / manual replay.
        await dlq(name)
          .add(job.name, { original: job.data, error: err.message, failedAt: new Date().toISOString() })
          .catch((e) => logger.error('dlq_push_failed', { queue: name, err: (e as Error).message }));
        logger.warn('job_dead_lettered', { queue: name, jobId: job.id });
      }
    });

    w.on('error', (e) => logger.error('worker_error', { queue: name, err: e.message }));
    workers.push(w);
  }
  logger.info('queue_workers_started', { queues: ALL_QUEUES, concurrency: CONCURRENCY });
}

export async function stopWorkers(): Promise<void> {
  await Promise.all(workers.map((w) => w.close().catch(() => undefined)));
  await Promise.all([...dlqs.values()].map((q) => q.close().catch(() => undefined)));
  workers.length = 0;
  dlqs.clear();
}
