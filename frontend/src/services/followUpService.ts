import api from './api';

export type FollowUpStatus  = 'PENDING' | 'REMINDED' | 'WAITING' | 'CLOSED';
export type FollowUpChannel = 'EMAIL' | 'TEAMS' | 'WHATSAPP' | 'CALL';

export interface FollowUp {
  id:        string;
  userId:    string;
  person:    string;
  topic:     string;
  dueDate:   string | null;
  channel:   FollowUpChannel;
  notes:     string | null;
  status:    FollowUpStatus;
  ageDays:   number;
  overdue:   boolean;
  createdAt: string;
  updatedAt: string;
}

// Backend is paginated/enveloped: payload is { items: FollowUp[] } (S10).
export const getFollowUps   = (status?: FollowUpStatus) =>
  api.get<{ items: FollowUp[] } | FollowUp[]>('/follow-ups', { params: status ? { status } : {} })
     .then(r => (Array.isArray(r.data) ? r.data : r.data.items ?? []));
export const createFollowUp = (data: { person: string; topic: string; dueDate?: string; channel?: FollowUpChannel; notes?: string }) =>
  api.post<FollowUp>('/follow-ups', data).then(r => r.data);
export const updateFollowUp = (id: string, data: Partial<FollowUp>) =>
  api.patch<FollowUp>(`/follow-ups/${id}`, data).then(r => r.data);
export const closeFollowUp  = (id: string) =>
  api.post<FollowUp>(`/follow-ups/${id}/close`).then(r => r.data);
export const deleteFollowUp = (id: string) =>
  api.delete(`/follow-ups/${id}`);
