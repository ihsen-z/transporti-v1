import { create } from 'zustand';

// Petit store de toast : un message à la fois. show() l'affiche, hide() le
// masque. L'affichage + l'auto-masquage sont gérés par <ToastHost/>.
interface ToastState {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  hide: () => set({ message: null }),
}));

// Helper impératif pour déclencher un toast hors composant (ex : onSuccess).
export function showToast(message: string) {
  useToastStore.getState().show(message);
}
