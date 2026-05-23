import { Client } from '@opensearch-project/opensearch';
import logger from '../utils/logger';

/**
 * Search abstraction. Single index per entity; a MANDATORY tenant term filter
 * is injected into every query by the abstraction itself — callers cannot
 * forget it (the search analog of the Prisma tenant-guard). Fully resilient:
 * if OPENSEARCH_URL is unset/unreachable, indexing is a no-op and search
 * returns empty — the product never fails because search is down.
 * (Dedicated per-tenant indices/clusters can come later for large tenants,
 *  mirroring the shared-schema → dedicated tenancy contract.)
 */
export type SearchEntity = 'workitem' | 'comment' | 'kb' | 'announcement';

const PREFIX = process.env.OPENSEARCH_INDEX_PREFIX || 'theory';
const URL = process.env.OPENSEARCH_URL;
export const searchEnabled = !!URL;

const indexName = (e: SearchEntity) => `${PREFIX}-${e}`;

let client: Client | null = null;
function getClient(): Client | null {
  if (!searchEnabled) return null;
  if (!client) {
    client = new Client({
      node: URL,
      auth: process.env.OPENSEARCH_USER
        ? { username: process.env.OPENSEARCH_USER, password: process.env.OPENSEARCH_PASS || '' }
        : undefined,
      ssl: { rejectUnauthorized: process.env.OPENSEARCH_TLS_INSECURE !== 'true' },
      requestTimeout: 2000,
    });
  }
  return client;
}

export interface SearchDoc {
  tenantId: string;
  entityId: string;
  title: string;
  text: string;
  meta?: Record<string, unknown>;
  createdAt?: string;
}

/**
 * Pure query builder — exported so the MANDATORY tenant isolation filter can be
 * asserted deterministically without a running cluster.
 */
export function buildSearchQuery(
  tenantId: string,
  q: string,
  opts: { page: number; pageSize: number },
): Record<string, unknown> {
  return {
    from: (opts.page - 1) * opts.pageSize,
    size: opts.pageSize,
    query: {
      bool: {
        filter: [{ term: { tenantId } }], // ← isolation: never optional
        must: [
          {
            multi_match: {
              query: q,
              fields: ['title^3', 'text'],
              fuzziness: 'AUTO', // typo tolerance
              operator: 'and',
            },
          },
        ],
      },
    },
  };
}

export async function indexDoc(entity: SearchEntity, doc: SearchDoc): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    await c.index({
      index: indexName(entity),
      id: `${doc.tenantId}:${doc.entityId}`,
      body: { ...doc, entityType: entity, createdAt: doc.createdAt ?? new Date().toISOString() },
      refresh: false,
    });
  } catch (e) {
    logger.warn('search index failed', { entity, id: doc.entityId, msg: (e as Error).message });
  }
}

export async function removeDoc(entity: SearchEntity, tenantId: string, entityId: string): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    await c.delete({ index: indexName(entity), id: `${tenantId}:${entityId}` });
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode !== 404) {
      logger.warn('search remove failed', { entity, entityId, msg: (e as Error).message });
    }
  }
}

export interface SearchResult {
  items: Array<{ entityId: string; title: string; score: number; meta?: unknown }>;
  total: number;
}

export async function search(
  entity: SearchEntity,
  tenantId: string,
  q: string,
  opts: { page: number; pageSize: number },
): Promise<SearchResult> {
  const c = getClient();
  if (!c || !q.trim()) return { items: [], total: 0 };
  try {
    const r = await c.search({ index: indexName(entity), body: buildSearchQuery(tenantId, q, opts) });
    const hits = (r.body.hits?.hits ?? []) as Array<{
      _score: number; _source: SearchDoc & { meta?: unknown };
    }>;
    const total =
      typeof r.body.hits?.total === 'number'
        ? r.body.hits.total
        : (r.body.hits?.total as { value?: number })?.value ?? hits.length;
    return {
      items: hits.map((h) => ({
        entityId: h._source.entityId,
        title: h._source.title,
        score: h._score,
        meta: h._source.meta,
      })),
      total,
    };
  } catch (e) {
    logger.warn('search query failed', { entity, msg: (e as Error).message });
    return { items: [], total: 0 };
  }
}
