/**
 * LAUNCH GATE — consolidated GA sign-off assertions for the #1 mandate
 * ("journals/secrets NEVER exposed by APIs or AI") + secret-hygiene.
 * Deterministic; runs in CI. If any of these fail, DO NOT ship.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { als } from '../src/core/als';
import prisma, { rawPrisma } from '../src/utils/prisma';
import { sanitizeForAI } from '../src/core/ai/redaction';
import { processExport } from '../src/core/export/processor';
import { getObject } from '../src/core/storage';
import { Role } from '@prisma/client';

const T = '00000000-0000-0000-0000-0000000lng01';
const SRC = path.join(__dirname, '..', 'src');

describe('LAUNCH · journals never exposed', () => {
  let uid: string;
  beforeAll(async () => {
    await rawPrisma.tenant.upsert({ where: { id: T }, update: {},
      create: { id: T, name: T, slug: T, status: 'ACTIVE', plan: 'ENTERPRISE' } });
    uid = (await rawPrisma.user.create({
      data: { tenantId: T, name: 'L', email: `lng-${Date.now()}@t.io`, passwordHash: 'x' },
    })).id;
    await rawPrisma.dailyLog.create({
      data: { tenantId: T, userId: uid, date: new Date(), journal: 'TOP-SECRET-JOURNAL', eodNote: 'PRIVATE-EOD' },
    });
    await rawPrisma.workItem.create({ data: { tenantId: T, userId: uid, sectionType: 'CR', title: 'wi-launch' } });
  });
  afterAll(async () => {
    await rawPrisma.exportJob.deleteMany({ where: { tenantId: T } });
    await rawPrisma.workItem.deleteMany({ where: { tenantId: T } });
    await rawPrisma.dailyLog.deleteMany({ where: { tenantId: T } });
    await rawPrisma.user.deleteMany({ where: { tenantId: T } });
    await rawPrisma.tenant.deleteMany({ where: { id: T } });
    await rawPrisma.$disconnect();
  });

  it('guarded client returns journal=null even when explicitly selected', async () => {
    const log = await als.run(
      { tenantId: T, userId: uid, role: Role.ADMIN, requestId: 'l' },
      async () => prisma.dailyLog.findFirst({ where: { userId: uid }, select: { id: true, journal: true } }),
    );
    expect(log).not.toBeNull();
    expect(log!.journal).toBeNull();
    // raw client still has it (server-side decrypt path remains possible)
    expect((await rawPrisma.dailyLog.findFirst({ where: { userId: uid } }))!.journal).toBe('TOP-SECRET-JOURNAL');
  });

  it('AI redaction strips journal + eodNote before any model call', () => {
    const { clean, redacted } = sanitizeForAI({ ok: 1, journal: 'X', eodNote: 'Y', nested: { journal: 'Z' } });
    expect(JSON.stringify(clean)).not.toMatch(/"X"|"Y"|"Z"/);
    expect(redacted).toEqual(expect.arrayContaining(['journal', 'eodNote', 'nested.journal']));
  });

  it('export output contains no journal/eod columns or values', async () => {
    const job = await rawPrisma.exportJob.create({
      data: { tenantId: T, userId: uid, type: 'workitems', format: 'csv', status: 'PENDING' },
    });
    await processExport(job.id);
    const done = await rawPrisma.exportJob.findUnique({ where: { id: job.id } });
    const content = (await getObject(done!.fileKey!)).toString();
    expect(content).toContain('wi-launch');
    expect(content.toLowerCase()).not.toContain('journal');
    expect(content).not.toContain('PRIVATE-EOD');
  });

  it('STATIC: no code path selects/returns `journal` (exposure pattern absent)', () => {
    // The only safe ways `journal` appears: encrypt-on-write (data), the
    // redaction deny-list, the shield, guarding comments/system-prompts.
    // A read-exposure would be `journal: true` in a select OR a controller
    // returning it — assert BOTH are absent across src.
    const sel = execSync(`grep -rn "journal:[[:space:]]*true" "${SRC}" || true`).toString().trim();
    expect(sel).toBe('');
    const resp = execSync(
      `grep -rn "journal" "${SRC}/controllers" 2>/dev/null | grep -iE "res\\.|ok\\(|return .*journal" || true`,
    ).toString().trim();
    expect(resp).toBe('');
  });
});

describe('LAUNCH · secret hygiene', () => {
  it('.env is git-ignored (cannot be committed) + .env.example has no real secrets', () => {
    const root = path.join(__dirname, '..', '..');
    const gi = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
    // The invariant that actually prevents leakage, independent of git state.
    expect(gi).toMatch(/^\.env$/m);
    expect(gi).toMatch(/^\.env\.\*$/m);
    expect(gi).toMatch(/^!\.env\.example$/m);
    const ex = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
    expect(ex).not.toMatch(/=(sk-|AKIA|eyJ[A-Za-z0-9_-]{12,})/); // no real keys/JWTs
  });
});
