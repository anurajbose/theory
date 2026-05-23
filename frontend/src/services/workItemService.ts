import api from './api';

export type WorkItemStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
export type Priority = 'P1' | 'P2' | 'P3' | 'LOW';

export interface WorkItem {
  id:          string;
  userId:      string;
  sectionType: string;
  title:       string;
  description: string | null;
  priority:    Priority;
  status:      WorkItemStatus;
  dueDate:     string | null;
  slaDate:     string | null;
  tags:        string[];
  effortTags:  unknown[];
  metadata:    Record<string, unknown>;
  blockedAt:   string | null;
  closedAt:    string | null;
  createdAt:   string;
  updatedAt:   string;
}

// Backend is paginated/enveloped: payload is { items: WorkItem[] } (S10).
// Tolerant of either shape so older callers keep working.
export const getWorkItems   = () =>
  api.get<{ items: WorkItem[] } | WorkItem[]>('/work-items')
     .then(r => (Array.isArray(r.data) ? r.data : r.data.items ?? []));
export const createWorkItem = (data: Partial<WorkItem> & { title: string; sectionType: string }) =>
  api.post<WorkItem>('/work-items', data).then(r => r.data);
export const updateWorkItem = (id: string, data: Partial<WorkItem>) =>
  api.patch<WorkItem>(`/work-items/${id}`, data).then(r => r.data);
export const moveWorkItem   = (id: string, data: { sectionType?: string; status?: WorkItemStatus }) =>
  api.patch<WorkItem>(`/work-items/${id}/move`, data).then(r => r.data);
export const deleteWorkItem = (id: string) =>
  api.delete(`/work-items/${id}`);
export const getSections    = () =>
  api.get<{ sections: string[]; jobRole: string | null }>('/work-items/sections').then(r => r.data);
