// Contrats notifications. Source : backend/notifications/views.py + serializers.py.
// Le push FCM (devices/register) est différé (dev build + config requis).

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// NotificationListSerializer. metadata = JSON libre (job_id, request_id…).
export interface NotificationDto {
  id: number;
  category: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

// GET notifications/unread-count/
export interface UnreadCountResponse {
  unread_count: number;
}

// Corps de POST notifications/devices/register/ (DeviceTokenRegisterSerializer).
// `token` est un token Expo (ExponentPushToken[...]) depuis la décision 4.1 —
// le champ accepte n'importe quelle chaîne côté serveur (cf. 4.3), seul
// `platform` est contraint.
export interface DeviceRegisterBody {
  platform: 'ANDROID' | 'IOS';
  token: string;
  device_name?: string;
}
