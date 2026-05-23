import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { JobRole } from '@prisma/client';
import { ok } from '../core/http';

export async function completeOnboarding(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const { jobRole, teamId, deptId, sections } = req.body;

  if (!jobRole || !Object.values(JobRole).includes(jobRole)) {
    res.status(400).json({ error: 'Valid jobRole required' });
    return;
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        jobRole,
        teamId:    teamId  || undefined,
        deptId:    deptId  || undefined,
        onboarded: true,
        // store custom section order in metadata via a separate table later;
        // for now persist as a notification seed so the board can read it
      },
      select: {
        id: true, name: true, email: true, role: true,
        jobRole: true, onboarded: true,
        dept: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
      },
    });

    // Seed a welcome notification
    await prisma.notification.create({
      data: {
        userId,
        type: 'SYSTEM',
        message: `Welcome to theory, ${user.name}! Your workspace is ready.`,
      },
    });

    res.json(user);
  } catch (err) {
    logger.error('completeOnboarding', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
