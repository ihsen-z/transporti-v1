// Préférences de notifications (backend NotificationPreference).
// Canaux (email/push/sms) + catégories d'alertes. Tous booléens.
export interface NotificationPrefsDto {
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  notify_new_offer: boolean;
  notify_offer_accepted: boolean;
  notify_job_completed: boolean;
  notify_new_message: boolean;
  notify_dispute: boolean;
}

// Clés éditables (utilisées pour piloter le rendu des interrupteurs).
export type NotificationPrefKey = keyof NotificationPrefsDto;

// GET /api/v1/auth/notification-preferences/ -> { data: {...} }.
export interface NotificationPrefsResponseDto {
  data: NotificationPrefsDto;
}

// PUT (partiel) -> { message, data }.
export interface UpdateNotificationPrefsResponseDto {
  message: string;
  data: NotificationPrefsDto;
}
