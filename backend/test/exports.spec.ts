import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rawPrisma } from '../src/utils/prisma';
import { toCsv, toJson } from '../src/core/export/csv';
import { signDownload, verifyDownload } from '../src/core/storage';
import { processExport } from '../src/core/export/processor';
import { getObject } from '../src/core/storage';

const TA = '00000000-0000-0000-0000-00000000ex01';
const TB = '00000000-0000-0000-0000-00000000ex02';

describe('CSV serializer', () => {
  it('quotes/escapes per RFC-4180', () => {
    const csv = toCsv([{ a: 'x', b: 'has,comma', c: 'q"ote' }, { a: 'line\nbreak', b: 1, c: null }]);
    expect(csv).toBe('a,b,c\r\nx,"has,comma","q""ote"\r\n"line\nbreak",1,');
    expect(JSON.parse(toJson([{ a: 1 }]))).toEqual([{ a: 1 }]);
  });
});

describe('signed download tokens', () => {
  it('round-trips, rejects tamper + expiry', () => {
    const t = signDownload('job-123', 300);
    expect(verifyDownload(t)).toBe('job-123');
    expect(verifyDownload(t + 'x')).toBeNull();
    expect(verifyDownload(t.replace(/\.[^.]+$/, '.deadbeef'))).toBeNull();
    expect(verifyDownload(signDownload('job-9', -1))).toBeNull(); // already expired
    expect(verifyDownload('not.a.token')).toBeNull();
  });
});

describe('export processor — tenant/user scoped, metadata-only', () => {
  let uA: string;
  let uB: string;

  beforeAll(async () => {
    for (const id of [TA, TB]) {
      await rawPrisma.tenant.upsert({ where: { id }, update: {},
        create: { id, name: id, slug: id, status: 'ACTIVE', plan: 'ENTERPRISE' } });
    }
    uA = (await rawPrisma.user.create({ data: { tenantId: TA, name: 'A', email: `ex-${Date.now()}@a.io`, passwordHash: 'x' } })).id;
    uB = (await rawPrisma.user.create({ data: { tenantId: TB, name: 'B', email: `ex-${Date.now()}@b.io`, passwordHash: 'x' } })).id;
    await rawPrisma.workItem.create({ data: { tenantId: TA, userId: uA, sectionType: 'CR', title: 'A-ITEM', status: 'TODO' } });
    await rawPrisma.workItem.create({ data: { tenantId: TB, userId: uB, sectionType: 'CR', title: 'B-ITEM', status: 'TODO' } });
  });
  afterAll(async () => {
    await rawPrisma.exportJob.deleteMany({ where: { tenantId: { in: [TA, TB] } } });
    await rawPrisma.workItem.deleteMany({ where: { tenantId: { in: [TA, TB] } } });
    await rawPrisma.user.deleteMany({ where: { tenantId: { in: [TA, TB] } } });
    await rawPrisma.tenant.deleteMany({ where: { id: { in: [TA, TB] } } });
    await rawPrisma.$disconnect();
  });

  it('produces a READY file scoped to the job tenant/user (no cross-tenant rows)', async () => {
    const job = await rawPrisma.exportJob.create({
      data: { tenantId: TA, userId: uA, type: 'workitems', format: 'csv', status: 'PENDING' },
    });
    await processExport(job.id);

    const done = await rawPrisma.exportJob.findUnique({ where: { id: job.id } });
    expect(done?.status).toBe('READY');
    expect(done?.rowCount).toBe(1);
    expect(done?.fileKey).toBeTruthy();

    const content = (await getObject(done!.fileKey!)).toString();
    expect(content).toContain('A-ITEM');
    expect(content).not.toContain('B-ITEM'); // tenant B excluded
    expect(content).not.toContain('journal'); // metadata-only columns
  });

  it('marks FAILED on unsupported type (and rethrows for queue retry/DLQ)', async () => {
    const job = await rawPrisma.exportJob.create({
      data: { tenantId: TA, userId: uA, type: 'bogus', format: 'csv', status: 'PENDING' },
    });
    await expect(processExport(job.id)).rejects.toThrow();
    const failed = await rawPrisma.exportJob.findUnique({ where: { id: job.id } });
    expect(failed?.status).toBe('FAILED');
    expect(failed?.error).toMatch(/unsupported export type/);
  });

  it('ignores non-PENDING jobs (idempotent)', async () => {
    const job = await rawPrisma.exportJob.create({
      data: { tenantId: TA, userId: uA, type: 'workitems', format: 'csv', status: 'READY' },
    });
    await processExport(job.id); // no-op
    const after = await rawPrisma.exportJob.findUnique({ where: { id: job.id } });
    expect(after?.status).toBe('READY');
    expect(after?.rowCount).toBe(0);
  });
});
