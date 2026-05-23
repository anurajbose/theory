import { AsyncLocalStorage } from 'async_hooks';
import { Role } from '@prisma/client';

/**
 * Per-request execution context. Carried implicitly through async calls so the
 * Prisma tenant-guard can enforce isolation without touching any controller.
 */
export interface RequestContext {
  tenantId: string;
  userId: string;
  role: Role;
  requestId: string;
  /** when true the tenant-guard passes through (system jobs, auth flows) */
  bypassTenant?: boolean;
}

export const als = new AsyncLocalStorage<RequestContext>();

export function getContext(): RequestContext | undefined {
  return als.getStore();
}

export function getTenantId(): string | undefined {
  const c = als.getStore();
  return c && !c.bypassTenant ? c.tenantId : undefined;
}

/** Run `fn` with tenant enforcement disabled (cron jobs, migrations, auth). */
export function runAsSystem<T>(fn: () => T): T {
  const parent = als.getStore();
  return als.run(
    {
      tenantId: parent?.tenantId ?? 'system',
      userId: parent?.userId ?? 'system',
      role: parent?.role ?? ('ADMIN' as Role),
      requestId: parent?.requestId ?? 'system',
      bypassTenant: true,
    },
    fn,
  );
}
