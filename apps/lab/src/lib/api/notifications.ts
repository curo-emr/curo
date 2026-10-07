import { apiClient } from '@curo/web/api';

export async function getNotificationCount(): Promise<number> {
  try {
    const res = await apiClient.get<{ count: number }>('/notifications/count');
    return res.data.count ?? 0;
  } catch {
    return 0;
  }
}
