import { connection } from '../queue/connection';
import { getContext } from './als';
import logger from '../utils/logger';

/**
 * Tenant-scoped cache-aside (CQRS read model for dashboards). One expensive
 * rollup computation per tenant per TTL regardless of request volume.
 *
 * Fully resilient + NON-BLOCKING: Redis ops are raced against a short timeout
 * (a down/connecting Redis with maxRetriesPerRequest:null would otherwise hang
 * forever). Any miss/error/timeout → compute directly. Keys are ALWAYS
 * tenant-prefixed so an entry can never leak across tenants.
 */
const OP_TIMEOUT_MS = 300;

function raceTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

function keyFor(name: string): string {
  const ctx = getContext();
  const tenantId = ctx && !ctx.bypassTenant ? ctx.tenantId : 'system';
  return `rm:${tenantId}:${name}`;
}

export async function cached<T>(
  name: string,
  ttlSeconds: number,
  produce: () => Promise<T>,
): Promise<T> {
  const key = keyFor(name);

  if (connection.status === 'ready') {
    try {
      const hit = await raceTimeout(connection.get(key), OP_TIMEOUT_MS);
      if (hit) return JSON.parse(hit) as T;
    } catch (e) {
      logger.warn('cache read bypassed', { key, msg: (e as Error).message });
    }
  }

  const value = await produce();

  if (connection.status === 'ready') {
    // fire-and-forget; never let it block or throw into the request
    void raceTimeout(
      connection.set(key, JSON.stringify(value), 'EX', ttlSeconds),
      OP_TIMEOUT_MS,
    ).catch(() => undefined);
  }
  return value;
}

/** Invalidate a tenant's read model (call on writes that must reflect now). */
export async function invalidate(name: string): Promise<void> {
  if (connection.status !== 'ready') return;
  await raceTimeout(connection.del(keyFor(name)), OP_TIMEOUT_MS).catch(() => undefined);
}
