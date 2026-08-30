import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { BasculeFavoriDto } from './dto';

// POST favorites/toggle/ — le SERVEUR decide : il cree ou supprime selon ce
// qu'il trouve, et renvoie l'etat resultant. L'appelant ne doit jamais
// inverser une variable locale : deux appuis rapides desynchroniseraient
// l'affichage de la base.
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (transporterId: number): Promise<BasculeFavoriDto> => {
      const res = await apiClient.post<BasculeFavoriDto>('favorites/toggle/', {
        transporter_id: transporterId,
      });
      return res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
