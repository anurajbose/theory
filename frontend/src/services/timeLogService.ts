import api from './api';

export type TimeCategory =
  | 'CR_WORK' | 'TICKET' | 'MEETING' | 'DOCS' | 'FOLLOW_UP'
  | 'STRATEGIC' | 'ADMIN' | 'SUPPORT' | 'ANALYSIS' | 'TESTING'
  | 'DEPLOY' | 'OTHER';

export interface TimeLog {
  id:          string;
  userId:      string;
  workItemId:  string | null;
  task:        string;
  category:    TimeCategory;
  startTime:   string;
  endTime:     string | null;
  durationMins:number | null;
  date:        string;
  createdAt:   string;
  workItem?:   { id: string; title: string; sectionType: string } | null;
}

export interface TimeLogResponse {
  logs:    TimeLog[];
  summary: Record<string, number>;
}

export const getTimeLogs    = (params?: { week?: boolean; date?: string }) =>
  api.get<TimeLogResponse>('/time-logs', { params }).then(r => r.data);
export const getRunningTimer = () =>
  api.get<TimeLog | null>('/time-logs/running').then(r => r.data);
export const createTimeLog  = (data: { task: string; category: TimeCategory; workItemId?: string; durationMins?: number; startTime?: string }) =>
  api.post<TimeLog>('/time-logs', data).then(r => r.data);
export const stopTimer      = (id: string) =>
  api.post<TimeLog>(`/time-logs/${id}/stop`).then(r => r.data);
export const updateTimeLog  = (id: string, data: Partial<TimeLog>) =>
  api.patch<TimeLog>(`/time-logs/${id}`, data).then(r => r.data);
export const deleteTimeLog  = (id: string) =>
  api.delete(`/time-logs/${id}`);
