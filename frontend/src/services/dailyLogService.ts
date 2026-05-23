import api from './api';

export interface DailyLog {
  id: string;
  date: string;
  focusText: string | null;
  moodScore: number | null;
  eodNote: string | null;
}

export interface StandupData {
  date: string;
  focus: string | null;
  yesterday: { title: string; status: string; section: string }[];
  today:     { title: string; status: string; section: string; priority: string }[];
  blockers:  { title: string; section: string; priority: string; blockedSince: string | null }[];
}

export async function getTodayLog(): Promise<DailyLog | null> {
  const { data } = await api.get('/daily-log/today');
  return data;
}

export async function updateLog(payload: Partial<Pick<DailyLog, 'focusText' | 'moodScore' | 'eodNote'>>) {
  const { data } = await api.patch('/daily-log/today', payload);
  return data as DailyLog;
}

export async function saveJournal(content: string) {
  await api.post('/daily-log/today/journal', { content });
}

export async function getStandup(): Promise<StandupData> {
  const { data } = await api.get('/daily-log/standup');
  return data;
}

export async function getEodStatus(): Promise<{ showPrompt: boolean; filled: boolean }> {
  const { data } = await api.get('/daily-log/eod-status');
  return data;
}

export async function getMoodAggregate(): Promise<{ average: number | null; count: number }> {
  const { data } = await api.get('/daily-log/mood-aggregate');
  return data;
}

// Sprint 1: graceful fallback for not-yet-built endpoints
export async function getMorningStats() {
  try {
    const [overdue, sla] = await Promise.all([
      api.get('/follow-ups?status=overdue&count=true').then((r) => r.data.count ?? 0).catch(() => 0),
      api.get('/work-items?sla_breach=today&count=true').then((r) => r.data.count ?? 0).catch(() => 0),
    ]);
    return { overdueFollowUps: overdue, slaBreaches: sla };
  } catch {
    return { overdueFollowUps: 0, slaBreaches: 0 };
  }
}
