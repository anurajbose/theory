import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { FollowUpStatus, FollowUpChannel } from '@prisma/client';
import { addDays, isPast, differenceInDays } from 'date-fns';
import { ok, AppError } from '../core/http';
import { pageSchema, paginate, softDelete } from '../core/crud';

/* ── schemas ── */
export const listQuery = pageSchema.extend({
  status: z.enum(['PENDING', 'WAITING', 'CLOSED']).optional(),
});
export const idParam = z.object({ id: z.string().uuid() });
export const createBody = z.object({
  person: z.string().trim().min(1).max(120),
  topic: z.string().trim().min(1).max(300),
  dueDate: z.coerce.date().nullish(),
  channel: z.nativeEnum(FollowUpChannel).optional(),
  notes: z.string().trim().max(5000).nullish(),
});
export const updateBody = z.object({
  person: z.string().trim().min(1).max(120).optional(),
  topic: z.string().trim().min(1).max(300).optional(),
  dueDate: z.coerce.date().nullish(),
  channel: z.nativeEnum(FollowUpChannel).optional(),
  notes: z.string().trim().max(5000).nullish(),
  status: z.nativeEnum(FollowUpStatus).optional(),
});

const own = (req: Request) => ({ userId: req.user!.sub });

/* GET /api/follow-ups — paginated + enriched */
export async function listFollowUps(req: Request, res: Response): Promise<void> {
  const { page, pageSize, status } = req.query as unknown as z.infer<typeof listQuery>;
  const where: Record<string, unknown> = { ...own(req) };
  if (status) where.status = status;

  const { items, meta } = await paginate<{
    createdAt: Date; dueDate: Date | null; status: FollowUpStatus;
  }>(prisma.followUp, where, {
    page, pageSize,
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
  });

  const now = new Date();
  const enriched = items.map((f) => ({
    ...f,
    ageDays: differenceInDays(now, f.createdAt),
    overdue: f.dueDate ? isPast(f.dueDate) && f.status !== 'CLOSED' : false,
  }));
  ok(res, { items: enriched }, meta);
}

/* POST /api/follow-ups */
export async function createFollowUp(req: Request, res: Response): Promise<void> {
  const b = req.body as z.infer<typeof createBody>;
  const item = await prisma.followUp.create({
    data: {
      userId: req.user!.sub,
      person: b.person,
      topic: b.topic,
      dueDate: b.dueDate ?? addDays(new Date(), 3),
      channel: b.channel ?? 'EMAIL',
      notes: b.notes ?? null,
      status: 'PENDING',
    },
  });
  ok(res, item, {}, 201);
}

/* PATCH /api/follow-ups/:id */
export async function updateFollowUp(req: Request, res: Response): Promise<void> {
  const { id } = req.params as z.infer<typeof idParam>;
  const existing = await prisma.followUp.findFirst({ where: { id, ...own(req) } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Follow-up not found');

  const b = req.body as z.infer<typeof updateBody>;
  const updated = await prisma.followUp.update({
    where: { id },
    data: {
      ...(b.person !== undefined && { person: b.person }),
      ...(b.topic !== undefined && { topic: b.topic }),
      ...(b.dueDate !== undefined && { dueDate: b.dueDate ?? null }),
      ...(b.channel !== undefined && { channel: b.channel }),
      ...(b.notes !== undefined && { notes: b.notes ?? null }),
      ...(b.status !== undefined && { status: b.status }),
    },
  });
  ok(res, updated);
}

/* POST /api/follow-ups/:id/close */
export async function closeFollowUp(req: Request, res: Response): Promise<void> {
  const { id } = req.params as z.infer<typeof idParam>;
  const existing = await prisma.followUp.findFirst({ where: { id, ...own(req) } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Follow-up not found');
  const updated = await prisma.followUp.update({ where: { id }, data: { status: 'CLOSED' } });
  ok(res, updated);
}

/* DELETE /api/follow-ups/:id — soft delete */
export async function deleteFollowUp(req: Request, res: Response): Promise<void> {
  const { id } = req.params as z.infer<typeof idParam>;
  const count = await softDelete(prisma.followUp, { id, ...own(req) });
  if (count === 0) throw new AppError(404, 'NOT_FOUND', 'Follow-up not found');
  ok(res, { deleted: count });
}
