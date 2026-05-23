import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { WorkItemStatus, Priority } from '@prisma/client';
import { ok, AppError } from '../core/http';
import { pageSchema, paginate, softDelete } from '../core/crud';
import { emitToUser } from '../realtime/io';
import { indexDoc, removeDoc } from '../core/search';

const live = (req: Request, ev: string, payload: unknown) =>
  emitToUser(req.user!.tid, req.user!.sub, ev, payload);

function indexWi(
  req: Request,
  wi: { id: string; title: string; description?: string | null; sectionType: string; tags?: string[] },
) {
  void indexDoc('workitem', {
    tenantId: req.user!.tid,
    entityId: wi.id,
    title: wi.title,
    text: [wi.description, wi.sectionType, (wi.tags ?? []).join(' ')].filter(Boolean).join(' '),
  });
}

/* ── schemas ── */
export const listQuery = pageSchema.extend({
  status: z.nativeEnum(WorkItemStatus).optional(),
  section: z.string().min(1).max(80).optional(),
});
export const idParam = z.object({ id: z.string().uuid() });
export const createBody = z.object({
  title: z.string().trim().min(1).max(200),
  sectionType: z.string().trim().min(1).max(80),
  description: z.string().trim().max(5000).nullish(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.coerce.date().nullish(),
  slaDate: z.coerce.date().nullish(),
  tags: z.array(z.string().max(40)).max(30).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export const updateBody = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).nullish(),
  status: z.nativeEnum(WorkItemStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.coerce.date().nullish(),
  slaDate: z.coerce.date().nullish(),
  tags: z.array(z.string().max(40)).max(30).optional(),
  sectionType: z.string().trim().min(1).max(80).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export const moveBody = z.object({
  sectionType: z.string().trim().min(1).max(80).optional(),
  status: z.nativeEnum(WorkItemStatus).optional(),
});

const own = (req: Request) => ({ userId: req.user!.sub });

/* GET /api/work-items — paginated */
export async function listWorkItems(req: Request, res: Response): Promise<void> {
  const { page, pageSize, status, section } = req.query as unknown as z.infer<typeof listQuery>;
  const where: Record<string, unknown> = { ...own(req) };
  if (status) where.status = status;
  if (section) where.sectionType = section;

  const { items, meta } = await paginate(prisma.workItem, where, {
    page, pageSize,
    orderBy: [{ sectionType: 'asc' }, { createdAt: 'asc' }],
  });
  ok(res, { items }, meta);
}

/* GET /api/work-items/sections */
export async function listSections(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const distinct = await prisma.workItem.findMany({
    where: { userId },
    select: { sectionType: true },
    distinct: ['sectionType'],
    orderBy: { sectionType: 'asc' },
  });
  const user = await prisma.user.findFirst({ where: { id: userId }, select: { jobRole: true } });
  ok(res, { sections: distinct.map((d) => d.sectionType), jobRole: user?.jobRole ?? null });
}

/* POST /api/work-items */
export async function createWorkItem(req: Request, res: Response): Promise<void> {
  const b = req.body as z.infer<typeof createBody>;
  const item = await prisma.workItem.create({
    data: {
      userId: req.user!.sub,
      title: b.title,
      sectionType: b.sectionType,
      description: b.description ?? null,
      priority: b.priority ?? 'P3',
      dueDate: b.dueDate ?? null,
      slaDate: b.slaDate ?? null,
      tags: b.tags ?? [],
      metadata: b.metadata ?? {},
      status: 'TODO',
    },
  });
  live(req, 'workitem:created', item);
  indexWi(req, item);
  ok(res, item, {}, 201);
}

function lifecycleExtra(
  status: WorkItemStatus | undefined,
  e: { blockedAt: Date | null; closedAt: Date | null },
) {
  const x: Record<string, unknown> = {};
  if (status === 'BLOCKED' && !e.blockedAt) x.blockedAt = new Date();
  if ((status === 'DONE' || status === 'CANCELLED') && !e.closedAt) x.closedAt = new Date();
  return x;
}

/* PATCH /api/work-items/:id */
export async function updateWorkItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params as z.infer<typeof idParam>;
  const existing = await prisma.workItem.findFirst({ where: { id, ...own(req) } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Work item not found');

  const b = req.body as z.infer<typeof updateBody>;
  const updated = await prisma.workItem.update({
    where: { id },
    data: {
      ...(b.title !== undefined && { title: b.title }),
      ...(b.description !== undefined && { description: b.description ?? null }),
      ...(b.status !== undefined && { status: b.status }),
      ...(b.priority !== undefined && { priority: b.priority }),
      ...(b.dueDate !== undefined && { dueDate: b.dueDate ?? null }),
      ...(b.slaDate !== undefined && { slaDate: b.slaDate ?? null }),
      ...(b.tags !== undefined && { tags: b.tags }),
      ...(b.sectionType !== undefined && { sectionType: b.sectionType }),
      ...(b.metadata !== undefined && { metadata: b.metadata }),
      ...lifecycleExtra(b.status, existing),
    },
  });
  live(req, 'workitem:updated', updated);
  indexWi(req, updated);
  ok(res, updated);
}

/* PATCH /api/work-items/:id/move */
export async function moveWorkItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params as z.infer<typeof idParam>;
  const existing = await prisma.workItem.findFirst({ where: { id, ...own(req) } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Work item not found');

  const b = req.body as z.infer<typeof moveBody>;
  const updated = await prisma.workItem.update({
    where: { id },
    data: {
      ...(b.sectionType !== undefined && { sectionType: b.sectionType }),
      ...(b.status !== undefined && { status: b.status }),
      ...lifecycleExtra(b.status, existing),
    },
  });
  live(req, 'workitem:moved', updated);
  indexWi(req, updated);
  ok(res, updated);
}

/* DELETE /api/work-items/:id — soft delete */
export async function deleteWorkItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params as z.infer<typeof idParam>;
  const count = await softDelete(prisma.workItem, { id, ...own(req) });
  if (count === 0) throw new AppError(404, 'NOT_FOUND', 'Work item not found');
  live(req, 'workitem:deleted', { id });
  void removeDoc('workitem', req.user!.tid, id);
  ok(res, { deleted: count });
}
