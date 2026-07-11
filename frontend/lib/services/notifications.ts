// Notifications Data Service
// Production — Real API only

import { apiClient } from '@/lib/api/client';
import type { Notification, ServiceResult, PaginatedResponse } from './types';

export async function getNotifications(): Promise<ServiceResult<Notification[]>> {
    const response = await apiClient.get<PaginatedResponse<Notification>>('/api/notifications/my/');
    return { data: response.results ?? response as unknown as Notification[], source: 'api' };
}

export async function markNotificationAsRead(id: number): Promise<void> {
    await apiClient.post(`/api/notifications/${id}/read/`);
}

export async function markAllNotificationsAsRead(): Promise<void> {
    await apiClient.post('/api/notifications/read-all/');
}
