import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { IdeaStatus, IdeaPriority } from '@prisma/client';

const OWN = (userId: string) => ({ userId });

/* GET /api/ideas?status=IDEA|PROPOSED|APPROVED|SHELVED */
export async function listIdeas(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { status } = req.query;

  const where: Record<string, unknown> = { ...OWN(userId) };
  if (status) where.status = status as IdeaStatus;

  const ideas = await prisma.idea.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  res.json(ideas);
}

/* POST /api/ideas */
export async function createIdea(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { title, problem, value, priority, source } = req.body;

  if (!title?.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  const idea = await prisma.idea.create({
    data: {
      userId,
      title:    title.trim(),
      problem:  problem?.trim()  ?? null,
      value:    value?.trim()    ?? null,
      priority: (priority as IdeaPriority) ?? 'MEDIUM',
      source:   source?.trim()   ?? null,
      status:   'IDEA',
    },
  });
  res.status(201).json(idea);
}

/* PATCH /api/ideas/:id */
export async function updateIdea(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { id } = req.params;

  const existing = await prisma.idea.findFirst({ where: { id, ...OWN(userId) } });
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  const { title, problem, value, priority, source, status } = req.body;

  const updated = await prisma.idea.update({
    where: { id },
    data: {
      ...(title    !== undefined && { title: title.trim() }),
      ...(problem  !== undefined && { problem:  problem?.trim()  ?? null }),
      ...(value    !== undefined && { value:    value?.trim()    ?? null }),
      ...(priority !== undefined && { priority: priority as IdeaPriority }),
      ...(source   !== undefined && { source:   source?.trim()   ?? null }),
      ...(status   !== undefined && { status:   status as IdeaStatus }),
    },
  });
  res.json(updated);
}

/* DELETE /api/ideas/:id */
export async function deleteIdea(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { id } = req.params;

  const existing = await prisma.idea.findFirst({ where: { id, ...OWN(userId) } });
  if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

  await prisma.idea.delete({ where: { id } });
  res.status(204).end();
}

/* POST /api/ideas/:id/promote — IDEA → PROPOSED + creates a WorkItem (CR) */
export async function promoteIdea(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { id } = req.params;

  const idea = await prisma.idea.findFirst({ where: { id, ...OWN(userId) } });
  if (!idea) { res.status(404).json({ error: 'Not found' }); return; }
  if (idea.status !== 'IDEA') {
    res.status(400).json({ error: 'Only IDEA-status ideas can be promoted' });
    return;
  }

  // Find a CR-like section from existing work items
  const crItem = await prisma.workItem.findFirst({
    where: { userId, sectionType: { contains: 'CR', mode: 'insensitive' } },
    select: { sectionType: true },
  });
  const crSection = crItem?.sectionType ?? 'CRs';

  const description = [
    idea.problem ? `Problem: ${idea.problem}` : null,
    idea.value   ? `Value: ${idea.value}`     : null,
  ].filter(Boolean).join('\n\n') || null;

  const [updatedIdea, workItem] = await prisma.$transaction([
    prisma.idea.update({
      where: { id },
      data: { status: 'PROPOSED' },
    }),
    prisma.workItem.create({
      data: {
        userId,
        title:       `[Idea] ${idea.title}`,
        sectionType: crSection,
        description,
        status:      'TODO',
        priority:    'P3',
        tags:        ['promoted-idea'],
        metadata:    { ideaId: id },
      },
    }),
  ]);

  // Link the idea to the new CR
  await prisma.idea.update({
    where: { id },
    data: { linkedCrId: workItem.id },
  });

  res.json({ idea: { ...updatedIdea, linkedCrId: workItem.id }, workItem });
}
