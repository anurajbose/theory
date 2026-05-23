import { rawPrisma } from '../../utils/prisma';
import logger from '../../utils/logger';
import { sanitizeForAI, containsLikelySecret } from './redaction';
import { resolvePrompt, render } from './registry';
import { moderate } from './moderation';

/**
 * THE single chokepoint for every AI operation. Enforces, in order:
 *  permission → registered-prompt → REDACTION → render → input moderation →
 *  residual-secret scan → model (injected; disabled by default) →
 *  output moderation → confidence → token/cost → AI audit → fallback.
 * Never throws into the caller — AI must degrade safely.
 */
export interface AiContext { userId: string; tenantId: string; role: string }
export interface AiRunInput {
  promptKey: string;
  version?: number;
  vars: Record<string, unknown>;
  ctx: AiContext;
  allowRoles?: string[];
}
export type AiStatus = 'ok' | 'blocked' | 'error' | 'fallback';
export interface AiResult {
  status: AiStatus;
  output: string | null;
  confidence: number | null;
  promptKey: string;
  promptVersion: number;
  redacted: string[];
  reason?: string;
}

export type ModelRunner = (
  prompt: string,
  model: string,
) => Promise<{ output: string; confidence?: number; inputTokens?: number; outputTokens?: number }>;

let modelRunner: ModelRunner | null = null;
/** S17 injects a real model here. Until then AI is governance-only (fallback). */
export function setModelRunner(fn: ModelRunner | null): void {
  modelRunner = fn;
}

const COST_PER_1K: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini': { in: 0.00015, out: 0.0006 },
  'gpt-4o': { in: 0.005, out: 0.015 },
};
const estTokens = (s: string) => Math.ceil(s.length / 4);

async function audit(
  ctx: AiContext,
  promptKey: string,
  promptVersion: number,
  model: string,
  status: AiStatus,
  o: Partial<{
    inputTokens: number; outputTokens: number; costUsd: number; latencyMs: number;
    confidence: number | null; moderationFlagged: boolean; redactedFields: string[]; reason: string;
  }>,
): Promise<void> {
  try {
    await rawPrisma.aiAuditLog.create({
      data: {
        tenantId: ctx.tenantId || null,
        userId: ctx.userId || null,
        promptKey, promptVersion, model, status,
        inputTokens: o.inputTokens ?? 0,
        outputTokens: o.outputTokens ?? 0,
        costUsd: o.costUsd ?? 0,
        latencyMs: o.latencyMs ?? 0,
        confidence: o.confidence ?? null,
        moderationFlagged: o.moderationFlagged ?? false,
        redactedFields: o.redactedFields ?? [],
        reason: o.reason ?? null,
      },
    });
  } catch (e) {
    logger.error('AI audit write failed', { promptKey, msg: (e as Error).message });
  }
}

export async function runAi(input: AiRunInput): Promise<AiResult> {
  const { promptKey, version, vars, ctx, allowRoles } = input;
  const start = Date.now();
  const base = { status: 'error' as AiStatus, output: null, confidence: null, promptKey, promptVersion: 0, redacted: [] as string[] };

  try {
    // 1. permission
    if (!ctx.userId || !ctx.tenantId) {
      await audit(ctx, promptKey, 0, 'disabled', 'error', { reason: 'no_context', latencyMs: Date.now() - start });
      return { ...base, reason: 'no_context' };
    }
    if (allowRoles && !allowRoles.includes(ctx.role)) {
      await audit(ctx, promptKey, 0, 'disabled', 'blocked', { reason: 'permission', latencyMs: Date.now() - start });
      return { ...base, status: 'blocked', reason: 'permission' };
    }

    // 2. registered prompt only
    const prompt = await resolvePrompt(promptKey, version);
    if (!prompt) {
      await audit(ctx, promptKey, 0, 'disabled', 'error', { reason: 'prompt_not_registered', latencyMs: Date.now() - start });
      return { ...base, reason: 'prompt_not_registered' };
    }

    // 3. REDACTION (journals/secrets can never reach the model)
    const { clean, redacted } = sanitizeForAI(vars);
    const rendered = render(prompt.template, clean as Record<string, unknown>);

    // 4. input moderation + residual-secret defence-in-depth
    const mod = moderate(rendered);
    if (!mod.allowed) {
      await audit(ctx, prompt.key, prompt.version, prompt.model, 'blocked',
        { reason: mod.reason, moderationFlagged: true, redactedFields: redacted, latencyMs: Date.now() - start });
      return { ...base, status: 'blocked', promptVersion: prompt.version, redacted, reason: mod.reason };
    }
    if (containsLikelySecret(rendered)) {
      await audit(ctx, prompt.key, prompt.version, prompt.model, 'blocked',
        { reason: 'residual_secret', moderationFlagged: true, redactedFields: redacted, latencyMs: Date.now() - start });
      return { ...base, status: 'blocked', promptVersion: prompt.version, redacted, reason: 'residual_secret' };
    }

    // 5. model — disabled by default (S16 is governance-only)
    if (!modelRunner || process.env.AI_ENABLED !== 'true') {
      await audit(ctx, prompt.key, prompt.version, prompt.model, 'fallback',
        { reason: 'ai_disabled', inputTokens: estTokens(rendered), redactedFields: redacted, latencyMs: Date.now() - start });
      return { status: 'fallback', output: null, confidence: null, promptKey: prompt.key, promptVersion: prompt.version, redacted, reason: 'ai_disabled' };
    }

    const r = await modelRunner(rendered, prompt.model);
    const outMod = moderate(r.output);
    const inTok = r.inputTokens ?? estTokens(rendered);
    const outTok = r.outputTokens ?? estTokens(r.output);
    const c = COST_PER_1K[prompt.model] ?? { in: 0, out: 0 };
    const costUsd = (inTok / 1000) * c.in + (outTok / 1000) * c.out;
    const confidence = typeof r.confidence === 'number' ? r.confidence : 0.5;

    if (!outMod.allowed) {
      await audit(ctx, prompt.key, prompt.version, prompt.model, 'blocked',
        { reason: `output_${outMod.reason}`, moderationFlagged: true, inputTokens: inTok, outputTokens: outTok, costUsd, confidence, redactedFields: redacted, latencyMs: Date.now() - start });
      return { ...base, status: 'blocked', promptVersion: prompt.version, redacted, reason: `output_${outMod.reason}` };
    }

    await audit(ctx, prompt.key, prompt.version, prompt.model, 'ok',
      { inputTokens: inTok, outputTokens: outTok, costUsd, confidence, redactedFields: redacted, latencyMs: Date.now() - start });
    return { status: 'ok', output: r.output, confidence, promptKey: prompt.key, promptVersion: prompt.version, redacted };
  } catch (e) {
    logger.error('AI gateway error', { promptKey, msg: (e as Error).message });
    await audit(ctx, promptKey, 0, 'disabled', 'error', { reason: 'exception', latencyMs: Date.now() - start });
    return { ...base, reason: 'exception' };
  }
}
