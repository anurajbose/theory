import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { Role } from '@prisma/client';

export async function listUsers(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          jobRole: true,
          teamId: true,
          deptId: true,
          managerId: true,
          createdAt: true,
          team: { select: { name: true } },
          dept: { select: { name: true } },
          manager: { select: { name: true } },
        },
      }),
      prisma.user.count(),
    ]);

    res.json({
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('listUsers error', { err, userId });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const adminId = req.user!.sub;
  const { id } = req.params;
  const { role, active, teamId, deptId, managerId } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(role !== undefined && { role: role as Role }),
        ...(active !== undefined && { active: Boolean(active) }),
        ...(teamId !== undefined && { teamId: teamId ?? null }),
        ...(deptId !== undefined && { deptId: deptId ?? null }),
        ...(managerId !== undefined && { managerId: managerId ?? null }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        jobRole: true,
        teamId: true,
        deptId: true,
        managerId: true,
        team: { select: { name: true } },
        dept: { select: { name: true } },
        manager: { select: { name: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    logger.error('updateUser error', { err, adminId, targetId: id });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;

  try {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    res.json(logs);
  } catch (err) {
    logger.error('listAuditLogs error', { err, userId });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAdminStats(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;

  try {
    const weekStart = getWeekStart();

    const [
      totalUsers,
      activeUsers,
      totalTeams,
      totalWorkItems,
      openBlockers,
      pendingFollowUps,
      kbArticles,
      weeklyTimeLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.team.count(),
      prisma.workItem.count(),
      prisma.workItem.count({ where: { status: 'BLOCKED' } }),
      prisma.followUp.count({ where: { status: { not: 'CLOSED' } } }),
      prisma.knowledgeBase.count(),
      prisma.timeLog.count({ where: { date: { gte: weekStart } } }),
    ]);

    res.json({
      totalUsers,
      activeUsers,
      totalTeams,
      totalWorkItems,
      openBlockers,
      pendingFollowUps,
      kbArticles,
      weeklyTimeLogs,
    });
  } catch (err) {
    logger.error('getAdminStats error', { err, userId });
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listTeams(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;

  try {
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' },
      include: {
        dept: {
          select: {
            name: true,
            bu: { select: { name: true } },
          },
        },
        manager: { select: { name: true } },
        _count: { select: { members: true } },
      },
    });

    const result = teams.map(t => ({
      id: t.id,
      name: t.name,
      deptName: t.dept?.name ?? null,
      buName: t.dept?.bu?.name ?? null,
      managerName: t.manager?.name ?? null,
      memberCount: t._count.members,
    }));

    res.json(result);
  } catch (err) {
    logger.error('listTeams error', { err, userId });
    res.status(500).json({ error: 'Internal server error' });
  }
}

function getWeekStart(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}
