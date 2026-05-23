import crypto from 'crypto';
import { rawPrisma } from '../../utils/prisma';
import { TenantPlan, TenantStatus } from '@prisma/client';
import logger from '../../utils/logger';

/**
 * Razorpay-style HMAC-SHA256 signature verification (hex). Constant-time.
 * Stripe uses its own scheme — `verifyStripeSignature` is a documented
 * extension point (needs the stripe SDK; tracked follow-up).
 */
export function verifyRazorpaySignature(raw: Buffer, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/** Provider-agnostic normalized billing event. */
export interface BillingEvent {
  tenantId: string;
  provider: string;
  externalId?: string;
  plan: TenantPlan;
  status: string; // subscription status: trialing|active|past_due|canceled
  currentPeriodEnd?: Date;
}

const SUB_TO_TENANT: Record<string, TenantStatus> = {
  active: 'ACTIVE',
  trialing: 'TRIAL',
  past_due: 'SUSPENDED',
  canceled: 'CANCELLED',
};

/** Idempotent: upsert Subscription + reflect plan/status onto the Tenant. */
export async function applyBillingEvent(e: BillingEvent): Promise<void> {
  const tenant = await rawPrisma.tenant.findUnique({ where: { id: e.tenantId }, select: { id: true } });
  if (!tenant) {
    logger.warn('billing event for unknown tenant', { tenantId: e.tenantId });
    return;
  }
  await rawPrisma.subscription.upsert({
    where: { tenantId: e.tenantId },
    create: {
      tenantId: e.tenantId, provider: e.provider, externalId: e.externalId ?? null,
      plan: e.plan, status: e.status, currentPeriodEnd: e.currentPeriodEnd ?? null,
    },
    update: {
      provider: e.provider, externalId: e.externalId ?? null,
      plan: e.plan, status: e.status, currentPeriodEnd: e.currentPeriodEnd ?? null,
    },
  });
  await rawPrisma.tenant.update({
    where: { id: e.tenantId },
    data: { plan: e.plan, status: SUB_TO_TENANT[e.status] ?? 'ACTIVE' },
  });
  logger.info('billing_event_applied', { tenantId: e.tenantId, plan: e.plan, status: e.status });
}
