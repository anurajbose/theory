import api from './api';

export type NotificationType =
  | 'FOLLOW_UP_OVERDUE'
  | 'SLA_BREACH'
  | 'EOD_PROMPT'
  | 'ANNOUNCEMENT'
  | 'ACTION_DUE'
  | 'STANDUP_MISSING'
  | 'BLOCKER_ALERT'
  | 'OVERLOAD_ALERT'
  | 'WIN_SPOTLIGHT'
  | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export async function fetchNotifications(): Promise<NotificationsResponse> {
  const { data } = await api.get<NotificationsResponse>('/notifications');
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/notifications/read-all');
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`);
}
