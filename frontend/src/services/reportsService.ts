import api from './api';

export interface PersonalWeeklyReport {
  week: { start: string; end: string };
  workItems: { done: number; inProgress: number; blocked: number; total: number };
  timeByCategory: Record<string, number>;
  totalMins: number;
  followUpsClosed: number;
  meetingsCount: number;
  effortScore: number | null;
  trend: Array<{
    weekStart: string;
    workDone: number;
    timeMins: number;
    effortScore: number | null;
  }>;
}

export interface TeamWeeklyReport {
  week: { start: string; end: string };
  aggregate: {
    totalDone: number;
    totalBlocked: number;
    slaCompliance: number;
    avgHealth: number | null;
  };
  byMember: Array<{
    userId: string;
    name: string;
    workDone: number;
    blocked: number;
    timeMins: number;
  }>;
}

export async function fetchPersonalReport(): Promise<PersonalWeeklyReport> {
  const response = await api.get<PersonalWeeklyReport>('/reports/personal');
  return response.data;
}

export async function fetchTeamReport(): Promise<TeamWeeklyReport> {
  const response = await api.get<TeamWeeklyReport>('/reports/team');
  return response.data;
}

export async function downloadPersonalCSV(from: string, to: string): Promise<void> {
  const response = await api.get('/reports/export', {
    params: { from, to },
    responseType: 'blob',
  });
  const blob = new Blob([response.data as BlobPart], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `report-${from}-${to}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
