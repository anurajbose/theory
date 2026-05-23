import prisma from '../utils/prisma';
import { emitToTenant } from '../realtime/io';
import logger from '../utils/logger';

/**
 * Append an activity-feed event (tenant_id auto-stamped by the guard within
 * the request context) and push it live to the tenant. Never throws into the
 * request path — feed is best-effort.
 */
export async function recordActivity(
  actorId: string,
  verb: string,
  entityType: string,
  entityId: string,
  summary: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const ev = await prisma.activityEvent.create({
      data: { actorId, verb, entityType, entityId, summary, metadata },
    });
    emitToTenant(ev.tenantId ?? '', 'activity:new', ev);
  } catch (err) {
    logger.error('recordActivity failed', { verb, entityType, err: (err as Error).message });
  }
}
