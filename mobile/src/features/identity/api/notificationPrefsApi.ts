import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/client';

export interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  notify_new_offer: boolean;
  notify_offer_accepted: boolean;
  notify_new_message: boolean;
}

export const useNotificationPreferences = () => {
  return useQuery<NotificationPreferences>({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/auth/notification-preferences/');
      // Backend format is { data: { ... } }
      return response.data.data;
    },
  });
};

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation<NotificationPreferences, Error, Partial<NotificationPreferences>>({
    mutationFn: async (payload) => {
      const response = await apiClient.put<any>('/auth/notification-preferences/', payload);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['notificationPreferences'], data);
    },
  });
};
