/**
 * THEORY — lean, tenant-correct demo seed.
 * Idempotent (upsert by stable id). Creates ONE demo org (the default tenant
 * the auth layer falls back to), branding, a small hierarchy, 9 sample
 * accounts spanning every role, and a little sample work so dashboards aren't
 * empty. Never run against production (staging/prod compose does not seed).
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const ROUNDS = 12;
const PASSWORD = 'Theory@123';
const TENANT_ID = '00000000-0000-0000-0000-000000000001'; // auth DEFAULT_TENANT

async function main() {
  const hash = await bcrypt.hash(PASSWORD, ROUNDS);

  // ── Purge ALL legacy demo credentials (cascades their data via FK) ──
  await prisma.user.deleteMany({ where: { id: { startsWith: 'user-' } } });

  // ── Tenant + branding ──
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: { name: 'theory demo', status: 'ACTIVE', plan: 'ENTERPRISE' },
    create: { id: TENANT_ID, name: 'theory demo', slug: 'default', status: 'ACTIVE', plan: 'ENTERPRISE' },
  });
  await prisma.tenantSettings.upsert({
    where: { tenantId: TENANT_ID },
    update: { brandName: 'theory' },
    create: { tenantId: TENANT_ID, brandName: 'theory', primaryColor: '#5457E5' },
  });
  await prisma.subscription.upsert({
    where: { tenantId: TENANT_ID },
    update: { plan: 'ENTERPRISE', status: 'active' },
    create: { tenantId: TENANT_ID, provider: 'manual', plan: 'ENTERPRISE', status: 'active' },
  });

  // ── Hierarchy ──
  const company = await prisma.company.upsert({
    where: { id: 'co-1' }, update: {},
    create: { id: 'co-1', tenantId: TENANT_ID, name: 'theory demo' },
  });
  const bu = await prisma.businessUnit.upsert({
    where: { id: 'bu-1' }, update: {},
    create: { id: 'bu-1', tenantId: TENANT_ID, name: 'Operations', companyId: company.id },
  });
  const deptTech = await prisma.department.upsert({
    where: { id: 'dept-tech' }, update: {},
    create: { id: 'dept-tech', tenantId: TENANT_ID, name: 'Technology', buId: bu.id },
  });
  const deptOps = await prisma.department.upsert({
    where: { id: 'dept-ops' }, update: {},
    create: { id: 'dept-ops', tenantId: TENANT_ID, name: 'Delivery', buId: bu.id },
  });
  const team = await prisma.team.upsert({
    where: { id: 'team-core' }, update: {},
    create: { id: 'team-core', tenantId: TENANT_ID, name: 'Core Team', deptId: deptTech.id },
  });

  // ── Sample accounts (every role) — password: Theory@123 ──
  type U = { id: string; name: string; email: string; role: 'ADMIN' | 'LEADERSHIP' | 'MANAGER' | 'EMPLOYEE'; jobRole: string; deptId: string };
  const users: U[] = [
    { id: 'u-admin',  name: 'Avery Admin',    email: 'admin@theory.in',     role: 'ADMIN',      jobRole: 'CUSTOM',    deptId: deptTech.id },
    { id: 'u-lead',   name: 'Lena Leader',    email: 'leadership@theory.in', role: 'LEADERSHIP', jobRole: 'PM',        deptId: deptTech.id },
    { id: 'u-mgr',    name: 'Marcus Manager', email: 'manager@theory.in',    role: 'MANAGER',    jobRole: 'PM',        deptId: deptOps.id },
    { id: 'u-ba',     name: 'Bianca Analyst', email: 'ba@theory.in',         role: 'EMPLOYEE',   jobRole: 'BA',        deptId: deptOps.id },
    { id: 'u-dev1',   name: 'Dev Rao',        email: 'dev1@theory.in',       role: 'EMPLOYEE',   jobRole: 'DEVELOPER', deptId: deptTech.id },
    { id: 'u-dev2',   name: 'Diya Sharma',    email: 'dev2@theory.in',       role: 'EMPLOYEE',   jobRole: 'DEVELOPER', deptId: deptTech.id },
    { id: 'u-qa',     name: 'Quinn Tester',   email: 'qa@theory.in',         role: 'EMPLOYEE',   jobRole: 'QA',        deptId: deptTech.id },
    { id: 'u-risk',   name: 'Ravi Risk',      email: 'risk@theory.in',       role: 'EMPLOYEE',   jobRole: 'RISK_ORM',  deptId: deptOps.id },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { name: u.name, role: u.role, passwordHash: hash, active: true },
      create: {
        id: u.id, tenantId: TENANT_ID, name: u.name, email: u.email,
        passwordHash: hash, role: u.role, jobRole: u.jobRole as never,
        deptId: u.deptId, teamId: team.id, onboarded: true, active: true,
      },
    });
  }
  // manager + reporting line
  await prisma.team.update({ where: { id: team.id }, data: { managerId: 'u-mgr' } });
  await prisma.user.updateMany({
    where: { id: { in: ['u-ba', 'u-dev1', 'u-dev2', 'u-qa', 'u-risk'] } },
    data: { managerId: 'u-mgr' },
  });

  // ── A little sample work so dashboards aren't empty ──
  const items = [
    { id: 'wi-1', userId: 'u-dev1', title: 'Implement OAuth callback', status: 'IN_PROGRESS', priority: 'P2' },
    { id: 'wi-2', userId: 'u-dev1', title: 'Fix pagination edge case', status: 'BLOCKED', priority: 'P1' },
    { id: 'wi-3', userId: 'u-qa',   title: 'Regression suite for billing', status: 'TODO', priority: 'P2' },
    { id: 'wi-4', userId: 'u-ba',   title: 'Draft requirements: exports', status: 'DONE', priority: 'P3' },
  ];
  for (const w of items) {
    await prisma.workItem.upsert({
      where: { id: w.id },
      update: { status: w.status as never },
      create: {
        id: w.id, tenantId: TENANT_ID, userId: w.userId, sectionType: 'CR',
        title: w.title, status: w.status as never, priority: w.priority as never,
        ...(w.status === 'BLOCKED' ? { blockedAt: new Date(Date.now() - 2 * 864e5) } : {}),
      },
    });
  }
  await prisma.followUp.upsert({
    where: { id: 'fu-1' }, update: {},
    create: {
      id: 'fu-1', tenantId: TENANT_ID, userId: 'u-ba', person: 'Vendor X',
      topic: 'Contract renewal', channel: 'EMAIL', status: 'PENDING',
      dueDate: new Date(Date.now() + 3 * 864e5),
    },
  });

  console.log('\n  ✓ Seed complete — org "theory demo" (ENTERPRISE)\n');
  console.log('  Sample accounts — password for ALL: ' + PASSWORD + '\n');
  for (const u of users) {
    console.log(`    ${u.email.padEnd(24)} ${u.role}`);
  }
  console.log('');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
