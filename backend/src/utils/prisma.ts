import { PrismaClient } from '@prisma/client';
import logger from './logger';
import { getContext } from '../core/als';

/**
 * rawPrisma — un-guarded client. ONLY for: auth flows (pre-tenant),
 * system jobs (via runAsSystem), and internal delegation by the guard.
 */
export const rawPrisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});
rawPrisma.$on('error', (e) => logger.error('Prisma error', e));
rawPrisma.$on('warn', (e) => logger.warn('Prisma warning', e));

/** Models carrying tenant_id — every owned table. */
const OWNED = new Set([
  'Company', 'BusinessUnit', 'Department', 'Team', 'User', 'RefreshToken',
  'DailyLog', 'Notification', 'WorkItem', 'FollowUp', 'TimeLog', 'Meeting',
  'Idea', 'TeamSignal', 'InvisibleEffort', 'KnowledgeBase', 'Announcement',
  'AuditLog', 'Comment', 'ActivityEvent', 'AiAuditLog', 'ExportJob',
  'Subscription',
]);

const READ_FILTERED = new Set([
  'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy',
  'updateMany', 'deleteMany',
]);

/** Pure reads also exclude soft-deleted rows (deleted_at IS NULL). */
const SOFT_READ = new Set([
  'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy',
]);

/**
 * Models that have BOTH `deleted_at` and `version` in the Prisma schema.
 * Append-only models (RefreshToken, AuditLog, ActivityEvent, AiAuditLog)
 * are excluded.
 */
const APPEND_ONLY = ['RefreshToken', 'AuditLog', 'ActivityEvent', 'AiAuditLog', 'ExportJob', 'Subscription'];
const SOFT_DELETABLE = new Set([...OWNED].filter((m) => !APPEND_ONLY.includes(m)));
const VERSIONED = SOFT_DELETABLE;

class TenantViolationError extends Error {
  status = 404;
  code = 'TENANT_SCOPE';
  constructor(msg = 'Resource not found in tenant scope') { super(msg); }
}

/** Fail-closed: an owned-model query ran with no tenant context and no bypass. */
class TenantContextError extends Error {
  status = 500;
  code = 'TENANT_CONTEXT_REQUIRED';
  constructor(msg = 'Tenant context required for this operation') { super(msg); }
}

function delegate(model: string) {
  return (rawPrisma as unknown as Record<string, unknown>)[
    model.charAt(0).toLowerCase() + model.slice(1)
  ] as {
    findFirst: (a: unknown) => Promise<unknown>;
    findFirstOrThrow: (a: unknown) => Promise<unknown>;
  };
}

/**
 * A Prisma unique-where may carry a COMPOUND unique block, e.g.
 * `{ userId_date: { userId, date } }`. That shape is valid for findUnique/
 * upsert/update/delete but NOT for findFirst's WhereInput. When the guard
 * delegates a unique read to findFirst it must flatten the block to its
 * scalar fields: `{ userId, date }`. (A unique-where never contains relation
 * or operator objects, so flattening any plain-object value is safe here.)
 */
function flattenUnique(where: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries((where ?? {}) as Record<string, unknown>)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      for (const [ik, iv] of Object.entries(v as Record<string, unknown>)) out[ik] = iv;
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * prisma — tenant-guarded client used by ALL controllers (no controller
 * changes required). When a request has a tenant context the guard:
 *  - injects tenant_id into reads / bulk writes
 *  - stamps tenant_id on creates
 *  - converts findUnique → tenant-scoped findFirst (no cross-tenant id reads)
 *  - ownership-checks single update/delete/upsert before proceeding
 * When there is no tenant context (auth/system) it passes through.
 */
const prisma = rawPrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const ctx = getContext();
        const tid = ctx && !ctx.bypassTenant ? ctx.tenantId : undefined;

        if (!OWNED.has(model)) return query(args);

        if (!tid) {
          // bypass = explicit system/auth path → allowed; otherwise FAIL CLOSED
          if (ctx?.bypassTenant) return query(args);
          throw new TenantContextError(
            `${model}.${operation} attempted without tenant context`,
          );
        }

        const a = (args ?? {}) as Record<string, unknown>;

        if (READ_FILTERED.has(operation)) {
          const scope: Record<string, unknown> = { tenantId: tid };
          if (SOFT_READ.has(operation) && SOFT_DELETABLE.has(model)) scope.deletedAt = null;
          a.where = a.where ? { AND: [a.where, scope] } : scope;
          return query(a);
        }

        if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
          const where: Record<string, unknown> = { ...flattenUnique(a.where), tenantId: tid };
          if (SOFT_DELETABLE.has(model)) where.deletedAt = null;
          const rest = { ...a }; delete rest.where;
          const d = delegate(model);
          return operation === 'findUnique'
            ? d.findFirst({ where, ...rest })
            : d.findFirstOrThrow({ where, ...rest });
        }

        if (operation === 'create') {
          a.data = { ...(a.data as object), tenantId: tid };
          return query(a);
        }
        if (operation === 'createMany') {
          const data = a.data as Record<string, unknown> | Record<string, unknown>[];
          a.data = Array.isArray(data)
            ? data.map((d) => ({ ...d, tenantId: tid }))
            : { ...data, tenantId: tid };
          return query(a);
        }

        if (operation === 'update' || operation === 'delete') {
          const owned = await delegate(model).findFirst({
            where: { ...flattenUnique(a.where), tenantId: tid },
            select: { id: true },
          });
          if (!owned) throw new TenantViolationError();
          // Optimistic lock: every update advances version (unless caller set it).
          if (operation === 'update' && VERSIONED.has(model)) {
            const d = a.data as Record<string, unknown> | undefined;
            if (d && typeof d === 'object' && d.version === undefined) {
              d.version = { increment: 1 };
            }
          }
          return query(a);
        }

        if (operation === 'upsert') {
          const existing = (await delegate(model).findFirst({
            where: flattenUnique(a.where),
            select: { id: true, tenantId: true },
          })) as { tenantId?: string } | null;
          if (existing && existing.tenantId !== tid) throw new TenantViolationError();
          a.create = { ...(a.create as object), tenantId: tid };
          return query(a);
        }

        return query(a);
      },
    },
  },
});

/**
 * JOURNAL SHIELD (defense-in-depth for the #1 mandate):
 * private journals are NEVER returned by any API/AI. Even if a controller
 * accidentally selects `journal`, the guarded client always yields null.
 * Writes are unaffected (they use `data`, not `result`). Server-side
 * decryption, if ever needed, must use `rawPrisma` deliberately.
 */
const guarded = prisma.$extends({
  result: {
    dailyLog: {
      journal: { needs: { id: true }, compute: () => null },
    },
  },
});

export { TenantViolationError, TenantContextError };
export default guarded;
