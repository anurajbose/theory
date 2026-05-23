import { RequestHandler } from 'express';
import { rawPrisma } from '../../utils/prisma';
import { TenantPlan } from '@prisma/client';
import { fail } from '../http';

export const PLAN_RANK: Record<TenantPlan, number> = { FREE: 0, PRO: 1, ENTERPRISE: 2 };

/**
 * Freemium matrix — the single source of truth (pricing page mirrors this).
 *
 *  FREE        (acquisition): daily workspace, work board, follow-ups,
 *              time log, meetings, ideas, comments, notifications, presence,
 *              basic search — everything NOT listed below.
 *  PRO         (per-org subscription): AI digests/triage, data exports,
 *              advanced/semantic search, manager analytics console.
 *  ENTERPRISE  (per-org): SSO enforcement, audit explorer, retention/legal
 *              hold, custom branding, priority support.
 *
 * A feature is free unless it appears here. Gate a route with
 * requirePlan(FEATURE_MIN_PLAN.<feature>).
 */
// THEORY is free forever for everyone. Every entry here is FREE so the
// requirePlan() gate is a no-op against any tenant. We keep the matrix
// and the gating code on purpose — they're cheap insurance if the model
// ever changes, and the keys are still the single source of truth used
// by the frontend pricing page and entitlements endpoint.
export const FEATURE_MIN_PLAN: Record<string, TenantPlan> = {
  ai:                'FREE',
  exports:           'FREE',
  advancedSearch:    'FREE',
  managerAnalytics:  'FREE',
  sso:               'FREE',
  auditExplorer:     'FREE',
  retentionPolicy:   'FREE',
  customBranding:    'FREE',
};

export interface TenantBilling {
  plan: TenantPlan;
  status: string; // TenantStatus
  ssoEnforced: boolean;
}

export async function loadTenantBilling(tenantId: string): Promise<TenantBilling | null> {
  const t = await rawPrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, status: true, ssoEnforced: true },
  });
  return t ? { plan: t.plan, status: t.status, ssoEnforced: t.ssoEnforced } : null;
}

/** Blocks SUSPENDED / CANCELLED tenants (auth + billing routes stay open). */
export const requireActiveTenant: RequestHandler = async (req, res, next) => {
  const tid = req.user?.tid;
  if (!tid) return next();
  const b = await loadTenantBilling(tid);
  if (b && (b.status === 'SUSPENDED' || b.status === 'CANCELLED')) {
    return fail(res, 403, 'TENANT_INACTIVE', `Tenant ${b.status.toLowerCase()}`);
  }
  next();
};

/** Plan gate: 402 if the tenant's plan is below the required tier. */
export function requirePlan(min: TenantPlan): RequestHandler {
  return async (req, res, next) => {
    const tid = req.user?.tid;
    if (!tid) return fail(res, 401, 'UNAUTHENTICATED', 'No tenant');
    const b = await loadTenantBilling(tid);
    if (!b) return fail(res, 404, 'TENANT_NOT_FOUND', 'Tenant not found');
    if (b.status === 'SUSPENDED' || b.status === 'CANCELLED') {
      return fail(res, 403, 'TENANT_INACTIVE', `Tenant ${b.status.toLowerCase()}`);
    }
    if (PLAN_RANK[b.plan] < PLAN_RANK[min]) {
      return fail(res, 402, 'PLAN_REQUIRED', `Requires ${min} plan`, { current: b.plan, required: min });
    }
    next();
  };
}
