import { create } from 'zustand';

interface NotificationState {
  unreadCount: number;
  pushPermission: 'granted' | 'denied' | 'undetermined';
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  setPushPermission: (permission: 'granted' | 'denied' | 'undetermined') => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  pushPermission: 'undetermined',
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrementUnreadCount: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  setPushPermission: (permission) => set({ pushPermission: permission }),
}));
