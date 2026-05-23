import { Request, Response } from 'express';
import { z } from 'zod';
import { ok } from '../core/http';
import { pageSchema } from '../core/crud';
import { search, searchEnabled, SearchEntity } from '../core/search';

export const searchQuery = pageSchema.extend({
  q: z.string().trim().min(1).max(200),
  type: z.enum(['workitem', 'comment', 'kb', 'announcement']),
});

/** GET /api/search — tenant-scoped, typo-tolerant. Tenant filter enforced by core/search. */
export async function doSearch(req: Request, res: Response): Promise<void> {
  const { q, type, page, pageSize } = req.query as unknown as z.infer<typeof searchQuery>;
  const result = await search(type as SearchEntity, req.user!.tid, q, { page, pageSize });
  ok(res, { items: result.items, enabled: searchEnabled }, {
    page, pageSize, total: result.total,
  });
}
