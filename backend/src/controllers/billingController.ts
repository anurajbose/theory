import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { rawPrisma } from '../utils/prisma';
import { ok, AppError } from '../core/http';
import { verifyRazorpaySignature, applyBillingEvent, BillingEvent } from '../core/billing/webhook';
import { FEATURE_MIN_PLAN, PLAN_RANK } from '../core/billing/plan';
import { TenantPlan } from '@prisma/client';
import logger from '../utils/logger';

/* GET /api/billing/subscription — current tenant's subscription (tenant-scoped) */
export async function getSubscription(req: Request, res: Response): Promise<void> {
  const sub = await prisma.subscription.findFirst({ where: { tenantId: req.user!.tid } });
  ok(res, sub ?? { plan: 'FREE', status: 'trialing', provider: 'manual' });
}

/* GET /api/billing/entitlements — resolved feature map for the UI.
   The frontend gates surfaces from this; the server still enforces
   independently via requirePlan, so this is convenience, not trust. */
export async function getEntitlements(req: Request, res: Response): Promise<void> {
  const tenant = await rawPrisma.tenant.findUnique({
    where: { id: req.user!.tid },
    select: { plan: true, status: true },
  });
  const plan = (tenant?.plan ?? 'FREE') as TenantPlan;
  const features: Record<string, boolean> = {};
  for (const [key, min] of Object.entries(FEATURE_MIN_PLAN)) {
    features[key] = PLAN_RANK[plan] >= PLAN_RANK[min];
  }
  ok(res, { plan, status: tenant?.status ?? 'TRIAL', features });
}

const PROVIDER_CONFIGURED = Boolean(
  process.env.STRIPE_SECRET || process.env.RAZORPAY_KEY_ID,
);

/* POST /api/billing/upgrade — self-serve plan change (admin only).
   Env-gated like the rest of the stack: with no payment provider
   configured we apply the change immediately (real freemium now);
   once Stripe/Razorpay keys are set this returns a checkout handoff
   instead and the webhook flips the plan. */
export async function upgradePlan(req: Request, res: Response): Promise<void> {
  if (req.user!.role !== 'ADMIN') {
    throw new AppError(403, 'FORBIDDEN', 'Only a workspace admin can change the plan');
  }
  const target = String(req.body?.plan ?? '').toUpperCase() as TenantPlan;
  if (!['FREE', 'PRO', 'ENTERPRISE'].includes(target)) {
    throw new AppError(400, 'BAD_PLAN', 'Unknown plan');
  }
  const tid = req.user!.tid;

  if (PROVIDER_CONFIGURED && target !== 'FREE') {
    // Production path — hand off to checkout; webhook applies the plan.
    ok(res, {
      mode: 'checkout',
      checkoutUrl: `${process.env.APP_URL || ''}/billing/checkout?plan=${target}`,
    });
    return;
  }

  await rawPrisma.tenant.update({ where: { id: tid }, data: { plan: target } });
  await rawPrisma.subscription.upsert({
    where: { tenantId: tid },
    create: {
      tenantId: tid, provider: 'manual', plan: target,
      status: target === 'FREE' ? 'trialing' : 'active',
    },
    update: { plan: target, status: target === 'FREE' ? 'trialing' : 'active' },
  });
  logger.info(`billing: tenant ${tid} → ${target} (manual)`);
  ok(res, { mode: 'applied', plan: target });
}

const PLANS = new Set<TenantPlan>(['FREE', 'PRO', 'ENTERPRISE']);

/** POST /api/billing/webhook/:provider — public, HMAC-verified, idempotent. */
export async function billingWebhook(req: Request, res: Response): Promise<void> {
  const provider = req.params.provider;
  const raw = (req as unknown as { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));

  if (provider === 'razorpay') {
    const sig = req.headers['x-razorpay-signature'] as string;
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    if (!verifyRazorpaySignature(raw, sig, secret)) {
      throw new AppError(401, 'BAD_SIGNATURE', 'Invalid webhook signature');
    }
  } else if (provider === 'stripe') {
    // Stripe signature verification requires the stripe SDK — tracked follow-up.
    throw new AppError(501, 'NOT_IMPLEMENTED', 'Stripe webhook not yet wired');
  } else {
    throw new AppError(400, 'UNKNOWN_PROVIDER', 'Unknown billing provider');
  }

  const body = req.body as {
    payload?: { subscription?: { entity?: { id?: string; status?: string; notes?: Record<string, string> } } };
  };
  const ent = body.payload?.subscription?.entity;
  const tenantId = ent?.notes?.tenantId;
  const planRaw = (ent?.notes?.plan ?? 'FREE').toUpperCase() as TenantPlan;

  if (!tenantId || !PLANS.has(planRaw)) {
    logger.warn('billing webhook missing/invalid tenant or plan', { provider });
    res.json({ received: true, ignored: true }); // ack to stop retries; nothing to apply
    return;
  }

  const event: BillingEvent = {
    tenantId,
    provider,
    externalId: ent?.id,
    plan: planRaw,
    status: ent?.status ?? 'active',
  };
  await applyBillingEvent(event);
  res.json({ received: true });
}
