import api from './api';

export interface ActionItem {
  desc:     string;
  owner_id?: string;
  due_date?: string;
  status:   'OPEN' | 'DONE';
}

export interface Meeting {
  id:          string;
  userId:      string;
  title:       string;
  date:        string;
  attendees:   string[];
  agenda:      string | null;
  decisions:   string | null;
  actionItems: ActionItem[];
  createdAt:   string;
  updatedAt:   string;
}

export interface MeetingStats { count: number; weeklyHoursEstimate: number }

export const getMeetings     = (range?: 'week' | 'month') =>
  api.get<Meeting[]>('/meetings', { params: range ? { range } : {} }).then(r => r.data);
export const getMeetingStats = () =>
  api.get<MeetingStats>('/meetings/stats').then(r => r.data);
export const createMeeting   = (data: { title: string; date: string; attendees?: string[]; agenda?: string; decisions?: string; actionItems?: ActionItem[] }) =>
  api.post<Meeting>('/meetings', data).then(r => r.data);
export const updateMeeting   = (id: string, data: Partial<Meeting>) =>
  api.patch<Meeting>(`/meetings/${id}`, data).then(r => r.data);
export const deleteMeeting   = (id: string) =>
  api.delete(`/meetings/${id}`);
