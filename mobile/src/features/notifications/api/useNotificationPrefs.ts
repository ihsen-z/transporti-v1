import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type {
  NotificationPrefsDto,
  NotificationPrefsResponseDto,
  UpdateNotificationPrefsResponseDto,
} from './prefsDto';

const PREFS_KEY = ['notificationPrefs'] as const;

// GET /api/v1/auth/notification-preferences/ (le user est auto-résolu côté
// serveur). Activé seulement quand le panneau est ouvert.
async function fetchPrefs(): Promise<NotificationPrefsDto> {
  const res = await apiClient.get<NotificationPrefsResponseDto>('auth/notification-preferences/');
  return res.data.data;
}

export function useNotificationPrefs(enabled: boolean) {
  return useQuery({ queryKey: PREFS_KEY, queryFn: fetchPrefs, enabled });
}

// PUT (partiel) — met à jour le cache avec la réponse serveur (source de vérité).
async function putPrefs(body: Partial<NotificationPrefsDto>): Promise<NotificationPrefsDto> {
  const res = await apiClient.put<UpdateNotificationPrefsResponseDto>(
    'auth/notification-preferences/',
    body,
  );
  return res.data.data;
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: putPrefs,
    onSuccess: (data) => qc.setQueryData(PREFS_KEY, data),
  });
}
