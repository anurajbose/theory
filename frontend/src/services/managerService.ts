import api from './api';

export interface ManagerOverview {
  memberCount: number;
  healthScore: number;
  blockers: number;
  slaCompliance: number;
  overdueFollowUps: number;
  weeklyMeetings: number;
  weeklyHours: number;
  workItemsByStatus: Record<string, number>;
}

export interface MemberWorkItems {
  userId: string;
  name: string;
  todo: number;
  inProgress: number;
  blocked: number;
  inReview: number;
  total: number;
}

export interface BlockerItem {
  id: string;
  title: string;
  priority: string;
  sectionType: string;
  blockedAt: string | null;
  blockedDays: number;
  memberName: string;
  userId: string;
}

export interface FollowUpItem {
  id: string;
  person: string;
  topic: string;
  dueDate: string | null;
  status: string;
  channel: string;
  overdue: boolean;
  ageDays: number;
  memberName: string;
  userId: string;
}

export interface TimeSummary {
  byCategory: Record<string, number>;
  byMember: { userId: string; name: string; totalMins: number; byCategory: Record<string, number> }[];
}

export interface MeetingSummary {
  totalMeetings: number;
  weeklyHoursEstimate: number;
  byMember: { userId: string; name: string; count: number }[];
}

export interface TeamSignalItem {
  teamId: string;
  teamName: string;
  date: string;
  healthScore: number;
  blockerCount: number;
  slaCompliance: number;
  workloadData: Record<string, unknown>;
}

export async function fetchManagerOverview(): Promise<ManagerOverview> {
  const { data } = await api.get<ManagerOverview>('/manager/overview');
  return data;
}

export async function fetchManagerWorkItems(): Promise<MemberWorkItems[]> {
  const { data } = await api.get<MemberWorkItems[]>('/manager/work-items');
  return data;
}

export async function fetchManagerBlockers(): Promise<BlockerItem[]> {
  const { data } = await api.get<BlockerItem[]>('/manager/blockers');
  return data;
}

export async function fetchManagerFollowUps(): Promise<FollowUpItem[]> {
  const { data } = await api.get<FollowUpItem[]>('/manager/follow-ups');
  return data;
}

export async function fetchManagerTimeSummary(): Promise<TimeSummary> {
  const { data } = await api.get<TimeSummary>('/manager/time-summary');
  return data;
}

export async function fetchManagerMeetings(): Promise<MeetingSummary> {
  const { data } = await api.get<MeetingSummary>('/manager/meetings');
  return data;
}

export async function fetchManagerTeamSignals(): Promise<TeamSignalItem[]> {
  const { data } = await api.get<TeamSignalItem[]>('/manager/team-signals');
  return data;
}
