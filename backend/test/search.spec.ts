import { describe, it, expect } from 'vitest';
import { buildSearchQuery, search, indexDoc, removeDoc, searchEnabled } from '../src/core/search';

describe('search — mandatory tenant isolation', () => {
  it('ALWAYS injects a tenant term filter (security keystone)', () => {
    const q = buildSearchQuery('tenant-A', 'hello', { page: 1, pageSize: 10 }) as {
      query: { bool: { filter: Array<{ term: { tenantId: string } }>; must: unknown[] } };
      from: number; size: number;
    };
    expect(q.query.bool.filter).toEqual([{ term: { tenantId: 'tenant-A' } }]);
    expect(q.from).toBe(0);
    expect(q.size).toBe(10);
  });

  it('different tenants produce different, non-overlapping filters', () => {
    const a = JSON.stringify(buildSearchQuery('A', 'x', { page: 2, pageSize: 5 }));
    const b = JSON.stringify(buildSearchQuery('B', 'x', { page: 2, pageSize: 5 }));
    expect(a).toContain('"tenantId":"A"');
    expect(b).toContain('"tenantId":"B"');
    expect(a).not.toContain('"tenantId":"B"');
  });

  it('applies typo tolerance (fuzziness AUTO) + pagination offset', () => {
    const q = JSON.stringify(buildSearchQuery('A', 'serch', { page: 3, pageSize: 20 }));
    expect(q).toContain('"fuzziness":"AUTO"');
    expect(JSON.parse(q).from).toBe(40); // (3-1)*20
  });
});

describe('search — resilient when OpenSearch is disabled', () => {
  it('is disabled in the test env (no OPENSEARCH_URL)', () => {
    expect(searchEnabled).toBe(false);
  });
  it('search returns empty, index/remove are safe no-ops (never throw)', async () => {
    await expect(search('workitem', 'A', 'q', { page: 1, pageSize: 10 }))
      .resolves.toEqual({ items: [], total: 0 });
    await expect(indexDoc('comment', { tenantId: 'A', entityId: '1', title: 't', text: 'x' }))
      .resolves.toBeUndefined();
    await expect(removeDoc('kb', 'A', '1')).resolves.toBeUndefined();
  });
  it('blank query short-circuits to empty', async () => {
    await expect(search('workitem', 'A', '   ', { page: 1, pageSize: 10 }))
      .resolves.toEqual({ items: [], total: 0 });
  });
});
