import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { ok, AppError } from '../core/http';
import { pageSchema, paginate, softDelete } from '../core/crud';
import { recordActivity } from '../core/activity';
import { createNotification } from './notificationController';
import { emitToUser } from '../realtime/io';
import { indexDoc, removeDoc } from '../core/search';

const ENTITY = z.enum(['WorkItem', 'FollowUp', 'Meeting', 'Idea', 'KnowledgeBase']);

export const listQuery = pageSchema.extend({
  entityType: ENTITY,
  entityId: z.string().uuid(),
});
export const createBody = z.object({
  entityType: ENTITY,
  entityId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
  mentions: z.array(z.string().uuid()).max(50).optional(),
});
export const idParam = z.object({ id: z.string().uuid() });
export const editBody = z.object({ body: z.string().trim().min(1).max(5000) });

/* GET /api/comments?entityType=&entityId= — paginated, tenant-scoped */
export async function listComments(req: Request, res: Response): Promise<void> {
  const { page, pageSize, entityType, entityId } = req.query as unknown as z.infer<typeof listQuery>;
  const { items, meta } = await paginate(
    prisma.comment,
    { entityType, entityId },
    { page, pageSize, orderBy: { createdAt: 'asc' } },
  );
  ok(res, { items }, meta);
}

/* POST /api/comments */
export async function createComment(req: Request, res: Response): Promise<void> {
  const b = req.body as z.infer<typeof createBody>;
  const actorId = req.user!.sub;

  // Mentions must be users of the SAME tenant (guard scopes this query).
  let mentions: string[] = [];
  if (b.mentions?.length) {
    const valid = await prisma.user.findMany({
      where: { id: { in: b.mentions } },
      select: { id: true },
    });
    mentions = valid.map((u) => u.id);
  }

  const comment = await prisma.comment.create({
    data: { authorId: actorId, entityType: b.entityType, entityId: b.entityId, body: b.body, mentions },
  });

  void indexDoc('comment', {
    tenantId: req.user!.tid, entityId: comment.id,
    title: `Comment on ${b.entityType}`, text: b.body,
    meta: { entityType: b.entityType, entityId: b.entityId },
  });

  await recordActivity(actorId, 'commented', b.entityType, b.entityId,
    `commented on ${b.entityType}`, { commentId: comment.id });

  // Notify + live-push each mentioned user (createNotification emits realtime).
  for (const uid of mentions) {
    if (uid === actorId) continue;
    await createNotification(uid, 'SYSTEM', `You were mentioned in a ${b.entityType}`,
      `/${b.entityType.toLowerCase()}/${b.entityId}`);
    emitToUser(req.user!.tid, uid, 'comment:mention', comment);
  }

  ok(res, comment, {}, 201);
}

/* PATCH /api/comments/:id — author only */
export async function editComment(req: Request, res: Response): Promise<void> {
  const { id } = req.params as z.infer<typeof idParam>;
  const { body } = req.body as z.infer<typeof editBody>;
  const existing = await prisma.comment.findFirst({ where: { id, authorId: req.user!.sub } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Comment not found');
  const updated = await prisma.comment.update({ where: { id }, data: { body } });
  void indexDoc('comment', {
    tenantId: req.user!.tid, entityId: id,
    title: `Comment on ${existing.entityType}`, text: body,
    meta: { entityType: existing.entityType, entityId: existing.entityId },
  });
  ok(res, updated);
}

/* DELETE /api/comments/:id — author only, soft delete */
export async function deleteComment(req: Request, res: Response): Promise<void> {
  const { id } = req.params as z.infer<typeof idParam>;
  const count = await softDelete(prisma.comment, { id, authorId: req.user!.sub });
  if (count === 0) throw new AppError(404, 'NOT_FOUND', 'Comment not found');
  void removeDoc('comment', req.user!.tid, id);
  ok(res, { deleted: count });
}
