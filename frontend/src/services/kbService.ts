import api from './api';

export type KBVisibility = 'PERSONAL' | 'TEAM' | 'ORG';

export interface KBArticle {
  id: string;
  userId: string;
  title: string;
  category: string | null;
  content: Record<string, unknown>;
  tags: string[];
  visibility: KBVisibility;
  linkedItemId: string | null;
  viewCount: number;
  version: number;
  pinned: boolean;
  versions: Array<{ version: number; content: Record<string, unknown>; savedAt: string }>;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string };
}

export interface CreateKBInput {
  title: string;
  category?: string;
  content: Record<string, unknown>;
  tags?: string[];
  visibility: KBVisibility;
  linkedItemId?: string;
}

export interface UpdateKBInput {
  title?: string;
  category?: string;
  content?: Record<string, unknown>;
  tags?: string[];
  visibility?: KBVisibility;
}

export async function fetchKBList(params?: {
  search?: string;
  tag?: string;
  visibility?: string;
  category?: string;
}): Promise<KBArticle[]> {
  const response = await api.get<KBArticle[]>('/kb', { params });
  return response.data;
}

export async function fetchKBArticle(id: string): Promise<KBArticle> {
  const response = await api.get<KBArticle>(`/kb/${id}`);
  return response.data;
}

export async function createKBArticle(input: CreateKBInput): Promise<KBArticle> {
  const response = await api.post<KBArticle>('/kb', input);
  return response.data;
}

export async function updateKBArticle(id: string, input: UpdateKBInput): Promise<KBArticle> {
  const response = await api.put<KBArticle>(`/kb/${id}`, input);
  return response.data;
}

export async function deleteKBArticle(id: string): Promise<void> {
  await api.delete(`/kb/${id}`);
}

export async function toggleKBPin(id: string): Promise<KBArticle> {
  const response = await api.patch<KBArticle>(`/kb/${id}/pin`);
  return response.data;
}
