import { useNotificationStore } from './notificationStore';

export const fcmService = {
  requestPermission: async (): Promise<boolean> => {
    console.log('[FCM Service] Requesting push notification permission (SANDBOX)...');
    useNotificationStore.getState().setPushPermission('granted');
    return true;
  },

  registerDevice: async (): Promise<string | null> => {
    console.log('[FCM Service] Registering device with token "sandbox-device-token-123"...');
    return 'sandbox-device-token-123';
  },

  unregisterDevice: async (): Promise<void> => {
    console.log('[FCM Service] Unregistering device token...');
  },
};
