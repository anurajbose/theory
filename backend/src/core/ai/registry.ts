import { rawPrisma } from '../../utils/prisma';

/**
 * Prompt registry. Global, system-managed (rawPrisma — NOT tenant-guarded).
 * No ad-hoc prompts: every AI call must reference a registered, active,
 * versioned prompt or it is rejected upstream by the gateway.
 */
export interface RegisteredPrompt {
  key: string;
  version: number;
  template: string;
  model: string;
}

export async function resolvePrompt(
  key: string,
  version?: number,
): Promise<RegisteredPrompt | null> {
  const p = await rawPrisma.aiPrompt.findFirst({
    where: { key, active: true, ...(version ? { version } : {}) },
    orderBy: { version: 'desc' },
    select: { key: true, version: true, template: true, model: true },
  });
  return p;
}

/** Strict {{var}} substitution. Missing vars render as empty (never throws). */
export function render(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, name: string) => {
    const v = vars[name];
    if (v === undefined || v === null) return '';
    return typeof v === 'string' ? v : JSON.stringify(v);
  });
}
