import { z } from 'zod';

/** Reusable pagination query — attach via validate({ query: pageSchema.merge(...) }). */
export const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type Page = z.infer<typeof pageSchema>;

/**
 * Prisma's generated per-model delegates have heavy generic signatures that
 * don't structurally satisfy a hand-written interface. These helpers are
 * model-agnostic infra — the loose delegate type is intentional; callers keep
 * full type safety via the generic result `<T>`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Delegate = any;

/**
 * Tenant-safe paginated read (the guarded client still injects tenant_id +
 * deleted_at IS NULL). Returns items + meta ready for ok(res, data, meta).
 */
export async function paginate<T>(
  model: Delegate,
  where: Record<string, unknown>,
  opts: { page: number; pageSize: number; orderBy?: unknown; select?: unknown; include?: unknown },
): Promise<{ items: T[]; meta: { page: number; pageSize: number; total: number } }> {
  const { page, pageSize, orderBy, select, include } = opts;
  const [items, total] = await Promise.all([
    model.findMany({
      where,
      orderBy,
      ...(select ? { select } : {}),
      ...(include ? { include } : {}),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }) as Promise<T[]>,
    model.count({ where }),
  ]);
  return { items, meta: { page, pageSize, total } };
}

/**
 * Soft delete — sets deleted_at via updateMany so the S7 read-filter hides the
 * row while it is retained for audit/legal-hold. Ownership scoping stays in
 * `where`; the guard adds tenant. Returns rows affected (0 ⇒ not found / not owned).
 */
export async function softDelete(
  model: Delegate,
  where: Record<string, unknown>,
): Promise<number> {
  const { count } = await model.updateMany({ where, data: { deletedAt: new Date() } });
  return count;
}
