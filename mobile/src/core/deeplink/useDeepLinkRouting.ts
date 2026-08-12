import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { jobDetailKey } from '@/features/tracking/api/useJobDetail';
import { reportError } from '@/core/observability';
import { resolveDeepLinkAction } from './resolve';

// Routage des liens profonds `transporti://`.
//
// Le schéma était déclaré dans app.json et l'intent-filter Android généré,
// mais AUCUN handler JS n'existait : le backend fabriquait déjà
// `transporti://payment/callback?...` (payments/views.py) et
// `transporti://reset-password?...` (users/views.py) sans que l'application ne
// sache quoi en faire. Ouvrir l'app par l'un de ces liens ne produisait rien.
//
// Monté dans le layout RACINE, et non dans le groupe (app) : un lien de
// réinitialisation de mot de passe arrive par définition alors qu'aucune
// session n'est ouverte, et serait perdu s'il fallait d'abord être connecté.
//
// La reconnaissance du lien vit dans `resolve.ts` (fonction pure, testée).

export function useDeepLinkRouting(): void {
  const url = Linking.useURL();
  const router = useRouter();
  const qc = useQueryClient();
  // Un même lien peut être re-livré (retour d'arrière-plan) : on ne rejoue pas
  // la vérification de paiement deux fois.
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!url || handled.current === url) return;
    handled.current = url;

    const action = resolveDeepLinkAction(Linking.parse(url));

    if (action.type === 'payment-callback') {
      if (action.jobId !== null) {
        router.push({ pathname: '/mission/[id]', params: { id: String(action.jobId) } });
      }

      // En développement aucun webhook de passerelle n'atteint le serveur :
      // cet appel est le seul moyen de faire passer l'escrow en HELD. Sans
      // lui, l'argent resterait en INITIATED et la mission ne démarrerait pas.
      if (action.success && action.gatewayRef) {
        apiClient
          .post('payments/verify/', { gateway_ref: action.gatewayRef })
          .then(() => {
            if (action.jobId !== null) {
              void qc.invalidateQueries({ queryKey: jobDetailKey(action.jobId) });
              void qc.invalidateQueries({ queryKey: ['jobEscrow', action.jobId] });
            }
          })
          .catch((err: unknown) => {
            reportError(
              err instanceof Error ? err : new Error('payment verify failed'),
              { gatewayRef: action.gatewayRef ?? '' },
            );
          });
      }
    }

    if (action.type === 'reset-password') {
      // Route non authentifiée : atteinte par définition sans session ouverte.
      // (auth)/_layout ne redirige vers /home que si une session existe déjà.
      router.push({
        pathname: '/reset-password',
        params: { uid: action.uid, token: action.token },
      });
    }
  }, [url, router, qc]);
}
