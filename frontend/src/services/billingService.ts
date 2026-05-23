import api from './api';

export type Plan = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface Entitlements {
  plan: Plan;
  status: string;
  features: Record<string, boolean>;
}

export async function getEntitlements(): Promise<Entitlements> {
  const { data } = await api.get<Entitlements>('/billing/entitlements');
  return data;
}

export async function upgrade(plan: Plan): Promise<{ mode: 'applied' | 'checkout'; plan?: Plan; checkoutUrl?: string }> {
  const { data } = await api.post('/billing/upgrade', { plan });
  return data;
}
