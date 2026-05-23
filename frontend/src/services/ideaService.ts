import api from './api';

export type IdeaStatus   = 'IDEA' | 'PROPOSED' | 'APPROVED' | 'SHELVED';
export type IdeaPriority = 'HIGH' | 'MEDIUM' | 'LOW' | 'PARKED';

export interface Idea {
  id:         string;
  userId:     string;
  title:      string;
  problem:    string | null;
  value:      string | null;
  priority:   IdeaPriority;
  status:     IdeaStatus;
  source:     string | null;
  linkedCrId: string | null;
  createdAt:  string;
  updatedAt:  string;
}

export const getIdeas    = (status?: IdeaStatus) =>
  api.get<Idea[]>('/ideas', { params: status ? { status } : {} }).then(r => r.data);
export const createIdea  = (data: { title: string; problem?: string; value?: string; priority?: IdeaPriority; source?: string }) =>
  api.post<Idea>('/ideas', data).then(r => r.data);
export const updateIdea  = (id: string, data: Partial<Idea>) =>
  api.patch<Idea>(`/ideas/${id}`, data).then(r => r.data);
export const promoteIdea = (id: string) =>
  api.post<{ idea: Idea; workItem: unknown }>(`/ideas/${id}/promote`).then(r => r.data);
export const deleteIdea  = (id: string) =>
  api.delete(`/ideas/${id}`);
