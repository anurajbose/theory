import { Request, Response } from 'express';
import { z } from 'zod';
import prisma, { rawPrisma } from '../utils/prisma';
import { NotificationType } from '@prisma/client';
import { ok, AppError } from '../core/http';
import { emitToUser } from '../realtime/io';
import logger from '../utils/logger';

/* ── validation schemas (consumed by the route via validate()) ── */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().optional(),
});
export const idParamSchema = z.object({ id: z.string().uuid() });

/** GET /api/notifications — paginated, tenant + user scoped */
export async function listNotifications(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { page, pageSize, unreadOnly } = req.query as unknown as z.infer<typeof listQuerySchema>;
  const where = { userId, ...(unreadOnly ? { read: false } : {}) };

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  ok(res, { notifications: items, unreadCount }, { page, pageSize, total });
}

/** PATCH /api/notifications/:id/read */
export async function markRead(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { id } = req.params as z.infer<typeof idParamSchema>;
  const notif = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notif) throw new AppError(404, 'NOT_FOUND', 'Notification not found');
  const updated = await prisma.notification.update({ where: { id }, data: { read: true } });
  ok(res, updated);
}

/** PATCH /api/notifications/read-all */
export async function markAllRead(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { count } = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  ok(res, { updated: count });
}

/** DELETE /api/notifications/:id */
export async function deleteNotification(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { id } = req.params as z.infer<typeof idParamSchema>;
  const { count } = await prisma.notification.deleteMany({ where: { id, userId } });
  ok(res, { deleted: count });
}

/**
 * Server-side helper (cron / queue / internal). NOT an endpoint.
 * Resolves tenant from the target user explicitly so notifications are ALWAYS
 * tenant-stamped — even when called under runAsSystem (guard bypassed).
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  message: string,
  link?: string,
) {
  const user = await rawPrisma.user.findUnique({
    where: { id: userId },
    select: { tenantId: true },
  });
  if (!user?.tenantId) {
    logger.warn('createNotification skipped — user/tenant not resolvable', { userId });
    return null;
  }
  const notif = await rawPrisma.notification.create({
    data: { userId, tenantId: user.tenantId, type, message, link: link ?? null },
  });
  emitToUser(user.tenantId, userId, 'notification:new', notif);
  return notif;
}
