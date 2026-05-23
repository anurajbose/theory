import { rawPrisma } from '../../utils/prisma';
import { toCsv, toJson } from './csv';
import { putObject } from '../storage';
import logger from '../../utils/logger';

const CAP = 50_000;
const TTL_MS = 24 * 3600 * 1000;

/** Metadata-only datasets — deliberately NO journal/eodNote/notes columns. */
async function fetchRows(type: string, tenantId: string | null, userId: string) {
  const base = { tenantId, userId };
  switch (type) {
    case 'workitems':
      return rawPrisma.workItem.findMany({
        where: { ...base, deletedAt: null }, take: CAP, orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, sectionType: true, status: true, priority: true, dueDate: true, slaDate: true, createdAt: true },
      });
    case 'followups':
      return rawPrisma.followUp.findMany({
        where: { ...base, deletedAt: null }, take: CAP, orderBy: { createdAt: 'desc' },
        select: { id: true, person: true, topic: true, status: true, channel: true, dueDate: true, createdAt: true },
      });
    case 'timelogs':
      return rawPrisma.timeLog.findMany({
        where: { ...base, deletedAt: null }, take: CAP, orderBy: { date: 'desc' },
        select: { id: true, task: true, category: true, durationMins: true, date: true },
      });
    case 'activity':
      return rawPrisma.activityEvent.findMany({
        where: { tenantId, actorId: userId }, take: CAP, orderBy: { createdAt: 'desc' },
        select: { id: true, verb: true, entityType: true, entityId: true, summary: true, createdAt: true },
      });
    default:
      throw new Error(`unsupported export type: ${type}`);
  }
}

/** Drives one export job through its lifecycle. Safe for queue/worker context. */
export async function processExport(jobId: string): Promise<void> {
  const job = await rawPrisma.exportJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== 'PENDING') return;

  await rawPrisma.exportJob.update({ where: { id: jobId }, data: { status: 'PROCESSING' } });

  try {
    const rows = (await fetchRows(job.type, job.tenantId, job.userId)) as Record<string, unknown>[];
    const payload = job.format === 'json' ? toJson(rows) : toCsv(rows);
    const fileKey = `${job.tenantId ?? 'sys'}_${job.id}.${job.format}`;
    await putObject(fileKey, payload);

    await rawPrisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'READY', fileKey, rowCount: rows.length,
        completedAt: new Date(), expiresAt: new Date(Date.now() + TTL_MS),
      },
    });
    logger.info('export_ready', { jobId, type: job.type, rows: rows.length });
  } catch (e) {
    await rawPrisma.exportJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: (e as Error).message.slice(0, 500), completedAt: new Date() },
    });
    logger.error('export_failed', { jobId, msg: (e as Error).message });
    throw e; // let BullMQ retry / DLQ (S6)
  }
}
