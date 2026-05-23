import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { KBVisibility, Role } from '@prisma/client';

export async function listKB(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const role = req.user!.role;
  const { search, tag, visibility, category } = req.query;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { teamId: true, deptId: true },
    });

    const visibilityFilter: KBVisibility[] = [];
    const orConditions: object[] = [];

    if (role === 'ADMIN' || role === 'MANAGER' || role === 'LEADERSHIP') {
      // PERSONAL own + all TEAM + all ORG
      orConditions.push({ userId, visibility: 'PERSONAL' as KBVisibility });
      orConditions.push({ visibility: 'TEAM' as KBVisibility });
      orConditions.push({ visibility: 'ORG' as KBVisibility });
    } else {
      // EMPLOYEE: own PERSONAL + team TEAM + all ORG
      orConditions.push({ userId, visibility: 'PERSONAL' as KBVisibility });
      if (user?.teamId) {
        orConditions.push({ visibility: 'TEAM' as KBVisibility });
      }
      orConditions.push({ visibility: 'ORG' as KBVisibility });
    }

    const where: Record<string, unknown> = {
      OR: orConditions,
    };

    if (visibility && visibilityFilter.length === 0) {
      // Apply visibility filter on top — intersect
      where.visibility = visibility as KBVisibility;
    }

    if (category) {
      where.category = category as string;
    }

    if (search) {
      where.title = { contains: search as string, mode: 'insensitive' };
    }

    if (tag) {
      where.tags = { has: tag as string };
    }

    const articles = await prisma.knowledgeBase.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    });

    res.json(articles);
  } catch (err) {
    logger.error('listKB error', { err, userId });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getKBArticle(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { id } = req.params;

  try {
    const article = await prisma.knowledgeBase.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    if (!article) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    // Increment viewCount
    await prisma.knowledgeBase.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({ ...article, viewCount: article.viewCount + 1 });
  } catch (err) {
    logger.error('getKBArticle error', { err, userId, id: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createKB(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { title, category, content, tags, visibility, linkedItemId } = req.body;

  if (!title?.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  if (!content) {
    res.status(400).json({ error: 'content is required' });
    return;
  }
  if (!visibility) {
    res.status(400).json({ error: 'visibility is required' });
    return;
  }

  try {
    const versions = [{ version: 1, content, savedAt: new Date().toISOString() }];

    const article = await prisma.knowledgeBase.create({
      data: {
        userId,
        title: title.trim(),
        category: category ?? null,
        content,
        tags: tags ?? [],
        visibility: visibility as KBVisibility,
        linkedItemId: linkedItemId ?? null,
        version: 1,
        versions,
        pinned: false,
        viewCount: 0,
      },
    });

    res.status(201).json(article);
  } catch (err) {
    logger.error('createKB error', { err, userId });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateKB(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { id } = req.params;
  const { title, category, content, tags, visibility, linkedItemId } = req.body;

  try {
    const existing = await prisma.knowledgeBase.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (existing.userId !== userId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const oldVersionEntry = {
      version: existing.version,
      content: existing.content,
      savedAt: existing.updatedAt.toISOString(),
    };

    const existingVersions = Array.isArray(existing.versions) ? existing.versions as object[] : [];
    const newVersions = [...existingVersions, oldVersionEntry];
    const newVersion = existing.version + 1;

    const updated = await prisma.knowledgeBase.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(category !== undefined && { category }),
        ...(content !== undefined && { content }),
        ...(tags !== undefined && { tags }),
        ...(visibility !== undefined && { visibility: visibility as KBVisibility }),
        ...(linkedItemId !== undefined && { linkedItemId }),
        version: newVersion,
        versions: newVersions,
      },
    });

    res.json(updated);
  } catch (err) {
    logger.error('updateKB error', { err, userId, id });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteKB(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const role = req.user!.role;
  const { id } = req.params;

  try {
    const existing = await prisma.knowledgeBase.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (existing.userId !== userId && role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await prisma.knowledgeBase.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    logger.error('deleteKB error', { err, userId, id });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function togglePin(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const role = req.user!.role;
  const { id } = req.params;

  try {
    const existing = await prisma.knowledgeBase.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (existing.userId !== userId && role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const updated = await prisma.knowledgeBase.update({
      where: { id },
      data: { pinned: !existing.pinned },
    });

    res.json(updated);
  } catch (err) {
    logger.error('togglePin error', { err, userId, id });
    res.status(500).json({ error: 'Internal server error' });
  }
}
