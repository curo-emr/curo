import { apiClient } from '@curo/web/api';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedResourceType?: string | null;
  relatedResourceId?: string | null;
}

export async function getNotificationCount(): Promise<number> {
  try {
    const res = await apiClient.get<{ count: number }>('/notifications/count');
    return res.data.count ?? 0;
  } catch {
    return 0;
  }
}

export async function getNotifications(pageSize = 10): Promise<AppNotification[]> {
  const res = await apiClient.get<AppNotification[]>('/notifications', { params: { pageSize } });
  return Array.isArray(res.data) ? res.data : [];
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.put(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.put('/notifications/read-all');
}
