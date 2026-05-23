import api from './api';

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type SignalScope = 'self' | 'team' | 'org';
export type SignalState = 'OPEN' | 'ACK' | 'SNOOZED' | 'RESOLVED' | 'DISMISSED';

export interface SignalLifecycle {
  state: SignalState;
  snoozedUntil?: string | null;
  ackedBy?: string | null;
  resolvedAt?: string | null;
  feedback?: -1 | 0 | 1 | null;
}

export interface Signal {
  id: string;
  type: string;
  severity: Severity;
  title: string;
  body: string;
  meta: string;
  scope: SignalScope;
  entityId?: string;
  subjectUserId?: string;
  count?: number;
  ts: string;
  lifecycle?: SignalLifecycle;
}

export interface SignalResponse {
  summary: {
    total: number;
    bySeverity: Record<Severity, number>;
    health: number;
  };
  signals: Signal[];
}

export async function getSignals(): Promise<SignalResponse> {
  const { data } = await api.get<SignalResponse>('/signals');
  return data;
}

export async function transitionSignal(
  id: string,
  state: SignalState,
  opts: { snoozedUntil?: string; notes?: string } = {},
): Promise<void> {
  await api.patch(`/signals/${encodeURIComponent(id)}/state`, { state, ...opts });
}

export async function feedbackSignal(id: string, feedback: -1 | 0 | 1): Promise<void> {
  await api.post(`/signals/${encodeURIComponent(id)}/feedback`, { feedback });
}
