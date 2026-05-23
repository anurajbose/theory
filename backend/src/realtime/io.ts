import type { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Redis } from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { JwtPayload } from '../middleware/auth';
import logger from '../utils/logger';

/** Rooms are the realtime tenant boundary — emissions are NEVER global. */
export const tenantRoom = (tid: string) => `t:${tid}`;
export const userRoom = (uid: string) => `u:${uid}`;

interface SockData { userId: string; tenantId: string; role: string }

let io: Server | null = null;
// Fallback presence (single instance / no-Redis): tenantId → userId → socket count
const mem = new Map<string, Map<string, number>>();

function bump(tid: string, uid: string, delta: number): number {
  let t = mem.get(tid);
  if (!t) { t = new Map(); mem.set(tid, t); }
  const n = (t.get(uid) ?? 0) + delta;
  if (n <= 0) t.delete(uid); else t.set(uid, n);
  return n;
}
const presenceList = (tid: string) => [...(mem.get(tid)?.keys() ?? [])];

export async function initRealtime(server: HttpServer): Promise<void> {
  io = new Server(server, {
    path: '/socket.io',
    cors: {
      origin: (process.env.FRONTEND_URL || 'http://localhost:3000').split(','),
      credentials: true,
    },
  });

  // Horizontal scale — Redis adapter (resilient: degrade to single-instance).
  try {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const pub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: null });
    const sub = pub.duplicate();
    await Promise.race([
      Promise.all([pub.connect(), sub.connect()]),
      new Promise((_, r) => setTimeout(() => r(new Error('redis timeout')), 1500)),
    ]);
    io.adapter(createAdapter(pub, sub));
    logger.info('realtime: redis adapter enabled');
  } catch (e) {
    logger.warn('realtime: redis adapter unavailable — single-instance mode', {
      msg: (e as Error).message,
    });
  }

  // ── JWT handshake — unauthenticated sockets are rejected ──
  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string) ||
      (socket.handshake.headers.authorization?.replace('Bearer ', '') ?? '');
    try {
      const p = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      if (!p.tid) return next(new Error('NO_TENANT'));
      (socket.data as SockData) = { userId: p.sub, tenantId: p.tid, role: p.role };
      next();
    } catch {
      next(new Error('UNAUTHENTICATED'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { userId, tenantId } = socket.data as SockData;
    socket.join(tenantRoom(tenantId));
    socket.join(userRoom(userId));

    bump(tenantId, userId, 1);
    io!.to(tenantRoom(tenantId)).emit('presence:update', { online: presenceList(tenantId) });
    logger.debug('socket_connected', { userId, tenantId, id: socket.id });

    socket.on('disconnect', () => {
      bump(tenantId, userId, -1);
      io?.to(tenantRoom(tenantId)).emit('presence:update', { online: presenceList(tenantId) });
    });
  });

  logger.info('realtime: Socket.IO ready');
}

/**
 * User-scoped push. The user room only ever contains that user's sockets,
 * which are tenant-bound at handshake → inherently tenant-safe. (Targeting
 * .to(tenant).to(user) would be a UNION = tenant-wide broadcast — avoided.)
 */
export function emitToUser(tenantId: string, userId: string, event: string, payload: unknown): void {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit(event, payload);
}

/** Tenant-wide scoped broadcast. Never global. */
export function emitToTenant(tenantId: string, event: string, payload: unknown): void {
  if (!io || !tenantId) return;
  io.to(tenantRoom(tenantId)).emit(event, payload);
}

export async function closeRealtime(): Promise<void> {
  if (io) { await io.close().catch(() => undefined); io = null; }
}
