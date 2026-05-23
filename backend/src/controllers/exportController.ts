import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { ok, AppError } from '../core/http';
import { pageSchema, paginate } from '../core/crud';
import { enqueueSafe, QueueName } from '../queue/queues';
import { signDownload, verifyDownload, getObject, objectExists } from '../core/storage';
import { writeAudit } from '../core/audit';

export const createBody = z.object({
  type: z.enum(['workitems', 'followups', 'timelogs', 'activity']),
  format: z.enum(['csv', 'json']),
  filters: z.record(z.unknown()).optional(),
});
export const listQuery = pageSchema;
export const idParam = z.object({ id: z.string().uuid() });
export const downloadQuery = z.object({ token: z.string().min(10) });

const mime: Record<string, string> = { csv: 'text/csv', json: 'application/json' };

/* POST /api/exports — enqueue an async export */
export async function createExport(req: Request, res: Response): Promise<void> {
  const b = req.body as z.infer<typeof createBody>;
  const job = await prisma.exportJob.create({
    data: { userId: req.user!.sub, type: b.type, format: b.format, filters: b.filters ?? {}, status: 'PENDING' },
  });
  const queued = await enqueueSafe(QueueName.EXPORTS, 'export', { jobId: job.id });
  await writeAudit({ action: 'export.requested', entity: 'ExportJob', entityId: job.id,
    userId: req.user!.sub, tenantId: req.user!.tid, after: { type: b.type, format: b.format, queued } });
  ok(res, { ...job, queued }, {}, 201);
}

/* GET /api/exports — caller's jobs, paginated */
export async function listExports(req: Request, res: Response): Promise<void> {
  const { page, pageSize } = req.query as unknown as z.infer<typeof listQuery>;
  const { items, meta } = await paginate(prisma.exportJob, { userId: req.user!.sub }, {
    page, pageSize, orderBy: { createdAt: 'desc' },
  });
  ok(res, { items }, meta);
}

/* GET /api/exports/:id — status (+ short-lived download token when READY) */
export async function getExport(req: Request, res: Response): Promise<void> {
  const { id } = req.params as z.infer<typeof idParam>;
  const job = await prisma.exportJob.findFirst({ where: { id, userId: req.user!.sub } });
  if (!job) throw new AppError(404, 'NOT_FOUND', 'Export not found');
  const downloadToken = job.status === 'READY' ? signDownload(job.id) : null;
  ok(res, { ...job, downloadToken });
}

/* GET /api/exports/:id/download?token= — auth + ownership + signed token + READY */
export async function downloadExport(req: Request, res: Response): Promise<void> {
  const { id } = req.params as z.infer<typeof idParam>;
  const { token } = req.query as unknown as z.infer<typeof downloadQuery>;

  if (verifyDownload(token) !== id) throw new AppError(403, 'BAD_TOKEN', 'Invalid or expired link');

  const job = await prisma.exportJob.findFirst({ where: { id, userId: req.user!.sub } });
  if (!job || job.status !== 'READY' || !job.fileKey) throw new AppError(404, 'NOT_READY', 'Export not available');
  if (job.expiresAt && job.expiresAt < new Date()) throw new AppError(410, 'EXPIRED', 'Export expired');
  if (!(await objectExists(job.fileKey))) throw new AppError(410, 'GONE', 'Export file removed');

  const buf = await getObject(job.fileKey);
  res.setHeader('Content-Type', mime[job.format] ?? 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="export-${job.type}-${job.id}.${job.format}"`);
  res.send(buf); // binary — intentionally not the JSON envelope
}
