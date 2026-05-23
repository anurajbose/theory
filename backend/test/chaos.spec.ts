/**
 * CHAOS — dependency-outage drills. Asserts THEORY DEGRADES, never crashes,
 * when Redis / OpenSearch / the model are unavailable (the resilience
 * invariants built across S5/S6/S14/S15/S16). Deterministic: the test env has
 * no Redis/OpenSearch/AI configured, i.e. it IS the outage scenario.
 */
import { describe, it, expect } from 'vitest';
import { search, indexDoc, removeDoc, searchEnabled } from '../src/core/search';
import { cached } from '../src/core/cache';
import { enqueueSafe, QueueName } from '../src/queue/queues';
import { emitToTenant, emitToUser } from '../src/realtime/io';
import { als } from '../src/core/als';
import { Role } from '@prisma/client';

const run = <T>(fn: () => Promise<T>) =>
  als.run({ tenantId: 'chaos-t', userId: 'u', role: Role.ADMIN, requestId: 'c' }, async () => fn());

describe('chaos: OpenSearch down', () => {
  it('search disabled → empty results, indexing is a silent no-op', async () => {
    expect(searchEnabled).toBe(false);
    await expect(search('workitem', 't', 'q', { page: 1, pageSize: 10 }))
      .resolves.toEqual({ items: [], total: 0 });
    await expect(indexDoc('workitem', { tenantId: 't', entityId: '1', title: 'x', text: 'y' }))
      .resolves.toBeUndefined();
    await expect(removeDoc('workitem', 't', '1')).resolves.toBeUndefined();
  });
});

describe('chaos: Redis down', () => {
  it('cache-aside still returns the computed value (no hang, no throw)', async () => {
    let computed = 0;
    const v = await run(() => cached('chaos', 30, async () => { computed++; return { ok: true }; }));
    expect(v).toEqual({ ok: true });
    expect(computed).toBe(1);
  });

  it('enqueueSafe returns false instead of blocking the request path', async () => {
    const start = Date.now();
    const queued = await enqueueSafe(QueueName.EXPORTS, 'job', { jobId: 'x' });
    expect(queued).toBe(false);
    expect(Date.now() - start).toBeLessThan(1000); // non-blocking
  });
});

describe('chaos: realtime not initialised', () => {
  it('emit helpers are safe no-ops (never throw, never global)', () => {
    expect(() => emitToTenant('t', 'evt', { a: 1 })).not.toThrow();
    expect(() => emitToUser('t', 'u', 'evt', { a: 1 })).not.toThrow();
  });
});
