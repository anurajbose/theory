import { describe, it, expect } from 'vitest';
import { QueueName, ALL_QUEUES, DEFAULT_JOB_OPTS, dlqName } from '../src/queue/queues';
import { PROCESSORS } from '../src/queue/processors';

describe('queue infrastructure (config)', () => {
  it('defines the six required queues', () => {
    expect(ALL_QUEUES.sort()).toEqual(
      ['ai', 'exports', 'notifications', 'reminders', 'reports', 'sla'],
    );
  });

  it('uses reliable defaults: retries + exponential backoff + retained failures', () => {
    expect(DEFAULT_JOB_OPTS.attempts).toBe(5);
    expect(DEFAULT_JOB_OPTS.backoff).toEqual({ type: 'exponential', delay: 2000 });
    expect(DEFAULT_JOB_OPTS.removeOnFail).toBe(false);
  });

  it('derives a deterministic dead-letter queue name', () => {
    expect(dlqName(QueueName.REPORTS)).toBe('reports-dlq');
    expect(dlqName(QueueName.SLA)).toBe('sla-dlq');
  });

  it('has a processor wired for every queue', () => {
    for (const q of ALL_QUEUES) {
      expect(typeof PROCESSORS[q as QueueName]).toBe('function');
    }
  });
});
