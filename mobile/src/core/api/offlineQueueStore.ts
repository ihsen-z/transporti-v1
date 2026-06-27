import { create } from 'zustand';
import { mmkvStorage } from '../storage/mmkv';

export interface OfflineCommand {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  createdAt: number;
}

interface OfflineQueueState {
  queue: OfflineCommand[];
  addCommand: (command: Omit<OfflineCommand, 'id' | 'createdAt'>) => void;
  removeCommand: (id: string) => void;
  clearQueue: () => void;
}

const OFFLINE_QUEUE_KEY = 'offline_queue';

export const useOfflineQueueStore = create<OfflineQueueState>((set, get) => {
  const cached = mmkvStorage.getItem(OFFLINE_QUEUE_KEY);
  const initialQueue = cached ? JSON.parse(cached) : [];

  const updateStorage = (queue: OfflineCommand[]) => {
    mmkvStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  };

  return {
    queue: initialQueue,
    addCommand: (cmd) => {
      const newCommand: OfflineCommand = {
        ...cmd,
        id: Math.random().toString(36).substring(2, 9),
        createdAt: Date.now(),
      };
      const newQueue = [...get().queue, newCommand];
      set({ queue: newQueue });
      updateStorage(newQueue);
    },
    removeCommand: (id) => {
      const newQueue = get().queue.filter((item) => item.id !== id);
      set({ queue: newQueue });
      updateStorage(newQueue);
    },
    clearQueue: () => {
      set({ queue: [] });
      updateStorage([]);
    },
  };
});
