import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

// ─── COMPANY ─────────────────────────────────────────────────────────────────

export async function getCompanies(_req: Request, res: Response): Promise<void> {
  try {
    const companies = await prisma.company.findMany({
      include: { _count: { select: { businessUnits: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(companies);
  } catch (err) {
    logger.error('getCompanies', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createCompany(req: Request, res: Response): Promise<void> {
  const { name, logoUrl, primaryColor } = req.body;
  if (!name) { res.status(400).json({ error: 'name required' }); return; }
  try {
    const company = await prisma.company.create({ data: { name, logoUrl, primaryColor } });
    res.status(201).json(company);
  } catch (err) {
    logger.error('createCompany', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateCompany(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, logoUrl, primaryColor } = req.body;
  try {
    const company = await prisma.company.update({
      where: { id },
      data: { name, logoUrl, primaryColor },
    });
    res.json(company);
  } catch {
    res.status(404).json({ error: 'Company not found' });
  }
}

// ─── BUSINESS UNIT ───────────────────────────────────────────────────────────

export async function getBusinessUnits(req: Request, res: Response): Promise<void> {
  try {
    const units = await prisma.businessUnit.findMany({
      include: {
        head: { select: { id: true, name: true } },
        _count: { select: { departments: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(units);
  } catch (err) {
    logger.error('getBusinessUnits', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createBusinessUnit(req: Request, res: Response): Promise<void> {
  const { name, companyId, headId } = req.body;
  if (!name || !companyId) { res.status(400).json({ error: 'name and companyId required' }); return; }
  try {
    const bu = await prisma.businessUnit.create({
      data: { name, companyId, headId },
      include: { head: { select: { id: true, name: true } } },
    });
    res.status(201).json(bu);
  } catch (err) {
    logger.error('createBusinessUnit', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateBusinessUnit(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, headId } = req.body;
  try {
    const bu = await prisma.businessUnit.update({
      where: { id },
      data: { name, headId },
      include: { head: { select: { id: true, name: true } } },
    });
    res.json(bu);
  } catch {
    res.status(404).json({ error: 'Business unit not found' });
  }
}

export async function deleteBusinessUnit(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await prisma.businessUnit.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch {
    res.status(404).json({ error: 'Business unit not found' });
  }
}

// ─── DEPARTMENT ──────────────────────────────────────────────────────────────

export async function getDepartments(req: Request, res: Response): Promise<void> {
  const { buId } = req.query;
  try {
    const depts = await prisma.department.findMany({
      where: buId ? { buId: String(buId) } : undefined,
      include: {
        bu: { select: { id: true, name: true } },
        head: { select: { id: true, name: true } },
        _count: { select: { teams: true, users: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(depts);
  } catch (err) {
    logger.error('getDepartments', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createDepartment(req: Request, res: Response): Promise<void> {
  const { name, buId, headId } = req.body;
  if (!name || !buId) { res.status(400).json({ error: 'name and buId required' }); return; }
  try {
    const dept = await prisma.department.create({
      data: { name, buId, headId },
      include: {
        bu: { select: { id: true, name: true } },
        head: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(dept);
  } catch (err) {
    logger.error('createDepartment', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateDepartment(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, headId, buId } = req.body;
  try {
    const dept = await prisma.department.update({
      where: { id },
      data: { name, headId, buId },
      include: {
        bu: { select: { id: true, name: true } },
        head: { select: { id: true, name: true } },
      },
    });
    res.json(dept);
  } catch {
    res.status(404).json({ error: 'Department not found' });
  }
}

export async function deleteDepartment(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await prisma.department.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch {
    res.status(404).json({ error: 'Department not found' });
  }
}

// ─── TEAM ────────────────────────────────────────────────────────────────────

export async function getTeams(req: Request, res: Response): Promise<void> {
  const { deptId } = req.query;
  try {
    const teams = await prisma.team.findMany({
      where: deptId ? { deptId: String(deptId) } : undefined,
      include: {
        dept: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(teams);
  } catch (err) {
    logger.error('getTeams', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getTeamById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        dept: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
        members: {
          select: {
            id: true, name: true, email: true,
            role: true, jobRole: true, avatarUrl: true,
          },
        },
      },
    });
    if (!team) { res.status(404).json({ error: 'Team not found' }); return; }
    res.json(team);
  } catch (err) {
    logger.error('getTeamById', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createTeam(req: Request, res: Response): Promise<void> {
  const { name, deptId, managerId } = req.body;
  if (!name || !deptId) { res.status(400).json({ error: 'name and deptId required' }); return; }
  try {
    const team = await prisma.team.create({
      data: { name, deptId, managerId },
      include: {
        dept: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(team);
  } catch (err) {
    logger.error('createTeam', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateTeam(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, managerId, deptId } = req.body;
  try {
    const team = await prisma.team.update({
      where: { id },
      data: { name, managerId, deptId },
      include: {
        dept: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
    });
    res.json(team);
  } catch {
    res.status(404).json({ error: 'Team not found' });
  }
}

export async function deleteTeam(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    await prisma.team.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch {
    res.status(404).json({ error: 'Team not found' });
  }
}

// ─── ORG TREE ────────────────────────────────────────────────────────────────
// Full hierarchy in one call — used by Admin panel tree editor

export async function getOrgTree(_req: Request, res: Response): Promise<void> {
  try {
    const companies = await prisma.company.findMany({
      include: {
        businessUnits: {
          include: {
            head: { select: { id: true, name: true } },
            departments: {
              include: {
                head: { select: { id: true, name: true } },
                teams: {
                  include: {
                    manager: { select: { id: true, name: true } },
                    _count: { select: { members: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    res.json(companies);
  } catch (err) {
    logger.error('getOrgTree', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
