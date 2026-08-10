import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import * as Linking from 'expo-linking';
import { apiClient } from '@/core/api/client';
import { jobDetailKey } from '@/features/tracking/api/useJobDetail';
import type { InitiatePaymentResponse, VerifyPaymentResponse } from './dto';

export type PayErrorKind = 'state' | 'forbidden' | 'network' | 'unknown';

export class PayError extends Error {
  constructor(public readonly kind: PayErrorKind) {
    super(kind);
    this.name = 'PayError';
  }
}

function toPayError(err: unknown): PayError {
  if (isAxiosError(err)) {
    if (err.response?.status === 400) return new PayError('state');
    if (err.response?.status === 403 || err.response?.status === 404) {
      return new PayError('forbidden');
    }
    if (!err.response) return new PayError('network');
  }
  return new PayError('unknown');
}

export interface PayResult {
  escrowStatus: VerifyPaymentResponse['status'];
  // true quand aucune vraie passerelle n'était en jeu : l'UI doit le dire
  // franchement à l'utilisateur plutôt que d'afficher « paiement réussi ».
  sandbox: boolean;
}

/**
 * Paiement d'une mission, de bout en bout.
 *
 * Deux chemins, parce que le backend en expose deux :
 *
 * 1. Passerelle réelle — `payment_url` est une page http(s). On l'ouvre dans le
 *    navigateur ; le retour se fait par lien profond `transporti://payment/callback`
 *    (voir src/core/deeplink), qui déclenche la vérification.
 * 2. SANDBOX — le backend renvoie comme `payment_url` notre PROPRE schéma
 *    (`transporti://payment/callback?...`) : il n'y a aucune page à afficher.
 *    Ouvrir un navigateur reboucherait dans l'application. On enchaîne donc
 *    directement sur la vérification, et on remonte `sandbox: true` pour que
 *    l'interface n'annonce pas un encaissement qui n'a pas eu lieu.
 *
 * Le jour où la passerelle est réelle, le chemin 1 gagnerait à passer par
 * `expo-web-browser` (`openAuthSessionAsync` capture le retour nativement).
 * On ne l'ajoute pas maintenant : ce serait un module natif de plus, donc un
 * nouveau build de développement, pour un chemin non testable aujourd'hui.
 */
async function payJob(jobId: number): Promise<PayResult> {
  let initiated: InitiatePaymentResponse;
  try {
    const res = await apiClient.post<InitiatePaymentResponse>('payments/initiate/', {
      job_id: jobId,
      platform: 'mobile',
    });
    initiated = res.data;
  } catch (err) {
    throw toPayError(err);
  }

  const isWebCheckout = /^https?:\/\//i.test(initiated.payment_url);

  if (isWebCheckout) {
    await Linking.openURL(initiated.payment_url);
    // La suite se joue au retour du lien profond : on ne vérifie pas ici,
    // sinon on interrogerait un paiement que l'utilisateur n'a pas encore fait.
    return { escrowStatus: 'INITIATED', sandbox: false };
  }

  try {
    const res = await apiClient.post<VerifyPaymentResponse>('payments/verify/', {
      gateway_ref: initiated.gateway_ref,
    });
    return { escrowStatus: res.data.status, sandbox: true };
  } catch (err) {
    throw toPayError(err);
  }
}

export function usePayJob() {
  const qc = useQueryClient();
  return useMutation<PayResult, PayError, number>({
    mutationFn: payJob,
    onSuccess: (_result, jobId) => {
      void qc.invalidateQueries({ queryKey: jobDetailKey(jobId) });
      void qc.invalidateQueries({ queryKey: ['jobEscrow', jobId] });
    },
  });
}
