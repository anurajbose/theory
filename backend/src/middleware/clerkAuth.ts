import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { Role } from '@prisma/client';
import { rawPrisma } from '../utils/prisma';
import { als } from '../core/als';
import logger from '../utils/logger';

/* ═══════════════════════════════════════════════════════════════
   CLERK AUTH ADAPTER
   Verifies Clerk session tokens, JIT-provisions our user / tenant
   rows from Clerk's user / organization, then produces the SAME
   req.user shape (sub, email, role, tid) as the legacy JWT path
   so all controllers, the tenant-guard, audit logging, and the
   ALS context keep working without per-route changes.
   ═══════════════════════════════════════════════════════════════ */

const SECRET = process.env.CLERK_SECRET_KEY;
const clerk = SECRET ? createClerkClient({ secretKey: SECRET }) : null;

export function clerkEnabled(): boolean {
  return Boolean(SECRET && clerk);
}

/** Map a Clerk organization role string to our enum. Defaults to EMPLOYEE. */
function mapRole(clerkRole?: string | null): Role {
  if (!clerkRole) return 'EMPLOYEE';
  const r = clerkRole.toLowerCase();
  if (r.includes('admin')) return 'ADMIN';
  if (r.includes('leadership') || r.includes('owner')) return 'LEADERSHIP';
  if (r.includes('manager') || r.includes('lead')) return 'MANAGER';
  return 'EMPLOYEE';
}

async function ensureTenant(clerkOrgId: string): Promise<{ id: string }> {
  const existing = await rawPrisma.tenant.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (existing) return existing;

  // First time we see this org — pull metadata from Clerk and JIT-create.
  const org = await clerk!.organizations.getOrganization({ organizationId: clerkOrgId });
  const slug = (org.slug ?? clerkOrgId).toLowerCase();
  const created = await rawPrisma.tenant.create({
    data: {
      name: org.name || slug,
      slug,
      plan: 'FREE',
      status: 'ACTIVE',
      clerkOrgId,
    },
    select: { id: true },
  });
  logger.info(`clerk: JIT-created tenant ${created.id} for org ${clerkOrgId}`);
  return created;
}

interface JitUser { id: string; email: string; role: Role }

async function ensureUser(
  clerkUserId: string,
  tenantId: string,
  role: Role,
): Promise<JitUser> {
  const existing = await rawPrisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true, email: true, role: true, tenantId: true, active: true },
  });

  if (existing) {
    // Sync if Clerk-side role / membership shifted, or row was deactivated.
    if (existing.role !== role || existing.tenantId !== tenantId || !existing.active) {
      const updated = await rawPrisma.user.update({
        where: { id: existing.id },
        data: { role, tenantId, active: true },
        select: { id: true, email: true, role: true },
      });
      return updated;
    }
    return { id: existing.id, email: existing.email, role: existing.role };
  }

  // First sight — fetch the Clerk user and create our row.
  const cu = await clerk!.users.getUser(clerkUserId);
  const email =
    cu.primaryEmailAddress?.emailAddress ??
    cu.emailAddresses[0]?.emailAddress ??
    `${clerkUserId}@clerk.placeholder`;
  const name =
    [cu.firstName, cu.lastName].filter(Boolean).join(' ') || cu.username || email;

  const created = await rawPrisma.user.create({
    data: {
      email,
      name,
      tenantId,
      role,
      clerkUserId,
      passwordHash: 'clerk-managed', // password unused under Clerk
      active: true,
    },
    select: { id: true, email: true, role: true },
  });
  logger.info(`clerk: JIT-created user ${created.id} (${email}) under tenant ${tenantId}`);
  return created;
}

interface ClerkClaims {
  sub?: string;
  org_id?: string;
  org_role?: string;
}

export async function clerkAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  if (!clerkEnabled()) {
    res.status(500).json({
      success: false, data: null, meta: { requestId },
      error: { code: 'CLERK_NOT_CONFIGURED', message: 'Clerk secret key missing', details: null },
    });
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false, data: null, meta: { requestId },
      error: { code: 'UNAUTHENTICATED', message: 'Missing token', details: null },
    });
    return;
  }

  try {
    const token = header.slice(7);
    const claims = (await verifyToken(token, { secretKey: SECRET! })) as ClerkClaims;
    const clerkUserId = claims.sub;
    const clerkOrgId = claims.org_id;

    if (!clerkUserId) {
      res.status(401).json({
        success: false, data: null, meta: { requestId },
        error: { code: 'UNAUTHENTICATED', message: 'Invalid token', details: null },
      });
      return;
    }
    if (!clerkOrgId) {
      // No org context — the frontend must prompt the user to pick or
      // create one (Clerk <OrganizationSwitcher> or <CreateOrganization>).
      res.status(403).json({
        success: false, data: null, meta: { requestId },
        error: { code: 'NO_ORG', message: 'Pick or create a workspace to continue.', details: null },
      });
      return;
    }

    const role = mapRole(claims.org_role);
    const tenant = await ensureTenant(clerkOrgId);
    const user = await ensureUser(clerkUserId, tenant.id, role);

    req.user = { sub: user.id, email: user.email, role: user.role, tid: tenant.id };
    req.tenantId = tenant.id;
    als.run(
      { tenantId: tenant.id, userId: user.id, role: user.role, requestId },
      () => next(),
    );
  } catch (err) {
    logger.warn('clerk: token verify failed', err);
    res.status(401).json({
      success: false, data: null, meta: { requestId },
      error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired token', details: null },
    });
  }
}
