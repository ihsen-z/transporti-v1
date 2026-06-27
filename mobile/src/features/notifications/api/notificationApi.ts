import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/client';

export interface NotificationDto {
  id: number;
  title: string;
  body: string;
  category: 'JOB' | 'PAYMENT' | 'TRUST' | 'DISPUTE' | 'REVIEW' | 'SYSTEM';
  is_read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  return useQuery<NotificationDto[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const baseUrl = apiClient.defaults.baseURL || 'http://localhost:8000/api/v1';
        const notificationsUrl = `${baseUrl.replace('/api/v1', '')}/api/notifications/my/`;
        const response = await apiClient.get<any>(notificationsUrl);
        const data = response.data;
        const list = data && typeof data === 'object' && 'results' in data ? data.results : (Array.isArray(data) ? data : []);
        return list;
      } catch (err) {
        console.warn('Failed to fetch notifications from backend, returning empty list', err);
        return [];
      }
    },
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await apiClient.patch(`/notifications/${id}/read/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
