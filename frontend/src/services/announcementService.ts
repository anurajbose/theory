import api from './api';

export type AnnouncementScope = 'COMPANY' | 'BU' | 'DEPT' | 'TEAM';

export interface Announcement {
  id: string;
  authorId: string;
  scopeType: AnnouncementScope;
  scopeId: string | null;
  title: string;
  body: string;
  attachments: unknown[];
  isUrgent: boolean;
  ackRequired: boolean;
  scheduledAt: string | null;
  acks: Record<string, string>;
  createdAt: string;
  acknowledged?: boolean;
  author?: { id: string; name: string };
}

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  scopeType: AnnouncementScope;
  scopeId?: string;
  isUrgent?: boolean;
  ackRequired?: boolean;
  scheduledAt?: string;
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const response = await api.get<Announcement[]>('/announcements');
  return response.data;
}

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
  const response = await api.post<Announcement>('/announcements', input);
  return response.data;
}

export async function acknowledgeAnnouncement(id: string): Promise<void> {
  await api.patch(`/announcements/${id}/ack`);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await api.delete(`/announcements/${id}`);
}
