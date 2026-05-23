import api from './api';

export interface OrgOverview {
  userCount: number;
  teamCount: number;
  deptCount: number;
  workItems: number;
  blockers: number;
  inProgress: number;
  done: number;
  slaCompliance: number;
  overdueFollowUps: number;
  weeklyMeetings: number;
  weeklyHours: number;
  timeByCategory: Record<string, number>;
}

export interface TeamSignalRow {
  id: string;
  name: string;
  dept: { id: string; name: string; bu: { id: string; name: string } };
  manager: { id: string; name: string } | null;
  _count: { members: number };
  signal: {
    teamId: string;
    date: string;
    healthScore: number;
    blockerCount: number;
    slaCompliance: number;
    workloadData: Record<string, unknown>;
  } | null;
}

export interface OrgBlocker {
  id: string;
  title: string;
  sectionType: string;
  priority: string;
  blockedAt: string | null;
  dueDate: string | null;
  blockedDays: number;
  user: {
    id: string;
    name: string;
    team: { id: string; name: string } | null;
    dept: { id: string; name: string } | null;
  };
}

export interface DeptCompliance {
  deptId: string;
  deptName: string;
  buName: string;
  totalSlaItems: number;
  breached: number;
  compliance: number;
}

export interface DeptWorkBreakdown {
  deptId: string;
  deptName: string;
  total: number;
  byStatus: Record<string, number>;
  blockers: number;
}

export async function fetchOrgOverview(): Promise<OrgOverview> {
  const { data } = await api.get<OrgOverview>('/leadership/overview');
  return data;
}

export async function fetchOrgTeamSignals(): Promise<TeamSignalRow[]> {
  const { data } = await api.get<TeamSignalRow[]>('/leadership/team-signals');
  return data;
}

export async function fetchOrgBlockers(): Promise<OrgBlocker[]> {
  const { data } = await api.get<OrgBlocker[]>('/leadership/blockers');
  return data;
}

export async function fetchOrgCompliance(): Promise<DeptCompliance[]> {
  const { data } = await api.get<DeptCompliance[]>('/leadership/compliance');
  return data;
}

export async function fetchOrgWorkBreakdown(): Promise<DeptWorkBreakdown[]> {
  const { data } = await api.get<DeptWorkBreakdown[]>('/leadership/work-breakdown');
  return data;
}
