import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { AnnouncementScope } from '@prisma/client';
import { createNotification } from './notificationController';

export async function listAnnouncements(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { teamId: true, deptId: true },
    });

    const orConditions: object[] = [
      { scopeType: 'COMPANY' as AnnouncementScope },
    ];

    if (user?.deptId) {
      orConditions.push({ scopeType: 'DEPT' as AnnouncementScope, scopeId: user.deptId });
    }

    if (user?.teamId) {
      orConditions.push({ scopeType: 'TEAM' as AnnouncementScope, scopeId: user.teamId });
    }

    const announcements = await prisma.announcement.findMany({
      where: { OR: orConditions },
      include: {
        author: { select: { id: true, name: true } },
      },
      orderBy: [{ isUrgent: 'desc' }, { createdAt: 'desc' }],
    });

    const enriched = announcements.map(a => {
      const acks = (a.acks as Record<string, string>) ?? {};
      return {
        ...a,
        acknowledged: acks[userId] !== undefined,
      };
    });

    res.json(enriched);
  } catch (err) {
    logger.error('listAnnouncements error', { err, userId });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createAnnouncement(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { title, body, scopeType, scopeId, isUrgent, ackRequired, scheduledAt } = req.body;

  if (!title?.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  if (!body?.trim()) {
    res.status(400).json({ error: 'body is required' });
    return;
  }
  if (!scopeType) {
    res.status(400).json({ error: 'scopeType is required' });
    return;
  }

  try {
    const announcement = await prisma.announcement.create({
      data: {
        authorId: userId,
        title: title.trim(),
        body: body.trim(),
        scopeType: scopeType as AnnouncementScope,
        scopeId: scopeId ?? null,
        isUrgent: isUrgent ?? false,
        ackRequired: ackRequired ?? false,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        attachments: [],
        acks: {},
      },
    });

    // Fan-out notifications
    let targetUsers: { id: string }[] = [];

    if (scopeType === 'COMPANY') {
      targetUsers = await prisma.user.findMany({
        where: { active: true },
        select: { id: true },
      });
    } else if (scopeType === 'DEPT' && scopeId) {
      targetUsers = await prisma.user.findMany({
        where: { deptId: scopeId, active: true },
        select: { id: true },
      });
    } else if (scopeType === 'TEAM' && scopeId) {
      targetUsers = await prisma.user.findMany({
        where: { teamId: scopeId, active: true },
        select: { id: true },
      });
    } else if (scopeType === 'BU' && scopeId) {
      const depts = await prisma.department.findMany({
        where: { buId: scopeId },
        select: { id: true },
      });
      const deptIds = depts.map(d => d.id);
      targetUsers = await prisma.user.findMany({
        where: { deptId: { in: deptIds }, active: true },
        select: { id: true },
      });
    }

    const notifMessage = `${isUrgent ? '[URGENT] ' : ''}${title.trim()}`;
    const notifLink = `/announcements/${announcement.id}`;

    await Promise.all(
      targetUsers
        .filter(u => u.id !== userId)
        .map(u => createNotification(u.id, 'ANNOUNCEMENT', notifMessage, notifLink))
    );

    res.status(201).json(announcement);
  } catch (err) {
    logger.error('createAnnouncement error', { err, userId });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function acknowledgeAnnouncement(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { id } = req.params;

  try {
    const announcement = await prisma.announcement.findUnique({ where: { id } });

    if (!announcement) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const acks = (announcement.acks as Record<string, string>) ?? {};
    acks[userId] = new Date().toISOString();

    const updated = await prisma.announcement.update({
      where: { id },
      data: { acks },
    });

    res.json(updated);
  } catch (err) {
    logger.error('acknowledgeAnnouncement error', { err, userId, id });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteAnnouncement(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const role = req.user!.role;
  const { id } = req.params;

  try {
    const announcement = await prisma.announcement.findUnique({ where: { id } });

    if (!announcement) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (announcement.authorId !== userId && role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    await prisma.announcement.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    logger.error('deleteAnnouncement error', { err, userId, id });
    res.status(500).json({ error: 'Internal server error' });
  }
}
