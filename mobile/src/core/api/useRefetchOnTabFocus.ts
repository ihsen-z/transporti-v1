import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';

// Recharge des listes quand l'utilisateur REVIENT sur un onglet.
//
// Les onglets de la barre restent montés : `refetchOnMount` ne rejoue donc
// jamais, et `refetchOnWindowFocus` ne réagit qu'au retour dans l'application,
// pas à un changement d'onglet. Sans ce hook, revenir sur « Demandes » après
// une minute sur « Messages » montrait la liste d'avant.
//
// Le premier focus est ignoré : la requête vient de se charger au montage.
export function shouldRefetchOnFocus(isFirstFocus: boolean): boolean {
  return !isFirstFocus;
}

export function useRefetchOnTabFocus(queryKeys: QueryKey[]): void {
  const queryClient = useQueryClient();
  const firstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      const first = firstFocus.current;
      firstFocus.current = false;
      if (!shouldRefetchOnFocus(first)) return;
      // `invalidateQueries` ne recharge que les requêtes actives (montées).
      for (const queryKey of queryKeys) {
        void queryClient.invalidateQueries({ queryKey });
      }
      // Les clés sont des littéraux stables fournis par l'appelant.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryClient]),
  );
}
