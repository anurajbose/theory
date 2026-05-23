import api from './api';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  jobRole: string;
  active: boolean;
  dept: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  manager: { id: string; name: string } | null;
  createdAt: string;
  onboarded: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTeams: number;
  totalWorkItems: number;
  openBlockers: number;
  pendingFollowUps: number;
  kbArticles: number;
  weeklyTimeLogs: number;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  timestamp: string;
  user: { id: string; name: string } | null;
}

export interface AdminTeam {
  id: string;
  name: string;
  deptName: string | null;
  buName: string | null;
  managerName: string | null;
  memberCount: number;
}

export interface UpdateUserInput {
  role?: string;
  active?: boolean;
  teamId?: string | null;
  deptId?: string | null;
  managerId?: string | null;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const response = await api.get<AdminStats>('/admin/stats');
  return response.data;
}

export async function fetchAdminUsers(
  page?: number,
  limit?: number
): Promise<{ users: AdminUser[]; total: number }> {
  const response = await api.get<{ users: AdminUser[]; total: number }>('/admin/users', {
    params: { page, limit },
  });
  return response.data;
}

export async function updateAdminUser(id: string, input: UpdateUserInput): Promise<AdminUser> {
  const response = await api.patch<AdminUser>(`/admin/users/${id}`, input);
  return response.data;
}

export async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  const response = await api.get<AuditLogEntry[]>('/admin/audit-logs');
  return response.data;
}

export async function fetchAdminTeams(): Promise<AdminTeam[]> {
  const response = await api.get<AdminTeam[]>('/admin/teams');
  return response.data;
}
