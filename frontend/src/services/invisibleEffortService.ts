import api from './api';

export interface EffortRecord {
  id: string;
  userId: string;
  weekStart: string;
  score: number;
  breakdown: {
    followUpsClosed: number;
    supportMins: number;
    meetingCount: number;
    kbArticles: number;
    raw: {
      followUpPoints: number;
      timePoints: number;
      meetingPoints: number;
      kbPoints: number;
    };
  };
  createdAt: string;
}

export interface TeamEffortRecord {
  userId: string;
  name: string;
  weekStart: string;
  score: number;
  breakdown: EffortRecord['breakdown'];
}

export async function computeMyEffort(): Promise<EffortRecord> {
  const response = await api.post<EffortRecord>('/invisible-effort/compute');
  return response.data;
}

export async function fetchMyEffortHistory(): Promise<EffortRecord[]> {
  const response = await api.get<EffortRecord[]>('/invisible-effort/history');
  return response.data;
}

export async function fetchTeamEffort(): Promise<TeamEffortRecord[]> {
  const response = await api.get<TeamEffortRecord[]>('/invisible-effort/team');
  return response.data;
}
