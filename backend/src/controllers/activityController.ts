import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { ok } from '../core/http';
import { pageSchema, paginate } from '../core/crud';

export const listQuery = pageSchema.extend({
  entityType: z.string().min(1).max(40).optional(),
  entityId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
});

/** GET /api/activity — tenant-scoped feed (optionally filtered). */
export async function listActivity(req: Request, res: Response): Promise<void> {
  const { page, pageSize, entityType, entityId, actorId } =
    req.query as unknown as z.infer<typeof listQuery>;

  const where: Record<string, unknown> = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (actorId) where.actorId = actorId;

  const { items, meta } = await paginate(prisma.activityEvent, where, {
    page, pageSize, orderBy: { createdAt: 'desc' },
  });
  ok(res, { items }, meta);
}
