import { rawPrisma } from '../utils/prisma';
import { getContext } from './als';
import logger from '../utils/logger';

/**
 * Immutable, append-only audit log. INSERT only — this module never exposes
 * update/delete. tenant_id / user_id / request_id are taken from the active
 * request context when available (falls back to explicit args).
 * (DB-level immutability — REVOKE UPDATE/DELETE + trigger — tracked for the
 * security-center sprint.)
 */
export interface AuditInput {
  action: string;          // e.g. 'auth.login', 'auth.login_failed'
  entity: string;          // e.g. 'User'
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  userId?: string | null;  // override (e.g. pre-auth flows)
  tenantId?: string | null;
}

export async function writeAudit(input: AuditInput): Promise<void> {
  const ctx = getContext();
  try {
    await rawPrisma.auditLog.create({
      data: {
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        before: (input.before ?? undefined) as object | undefined,
        after: (input.after ?? undefined) as object | undefined,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        userId: input.userId ?? ctx?.userId ?? null,
        tenantId: input.tenantId ?? (ctx && !ctx.bypassTenant ? ctx.tenantId : null),
      },
    });
  } catch (err) {
    // Audit must never break the request path, but failures are loud.
    logger.error('AUDIT write failed', { action: input.action, err });
  }
}
