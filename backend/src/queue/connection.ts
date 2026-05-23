import { Redis } from 'ioredis';
import logger from '../utils/logger';

/**
 * Shared Redis connection for BullMQ. lazyConnect → importing this module
 * never forces a connection (safe for tests / Redis-down boot). BullMQ
 * requires maxRetriesPerRequest=null.
 */
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
});

connection.on('error', (e) => logger.error('Redis error', { msg: e.message }));
connection.on('ready', () => logger.info('Redis connected', { url: redactedUrl() }));

function redactedUrl(): string {
  try {
    const u = new URL(REDIS_URL);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return 'redis';
  }
}

/** Best-effort readiness ping with a hard timeout (used by /ready). */
export async function redisReady(timeoutMs = 800): Promise<boolean> {
  try {
    const ping = connection.status === 'ready'
      ? connection.ping()
      : connection.connect().then(() => connection.ping());
    const res = await Promise.race([
      ping,
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
    ]);
    return res === 'PONG';
  } catch {
    return false;
  }
}

export async function closeConnection(): Promise<void> {
  try {
    await connection.quit();
  } catch {
    /* already closed */
  }
}
