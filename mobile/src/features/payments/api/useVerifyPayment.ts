import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { jobDetailKey } from '@/features/tracking/api/useJobDetail';
import type { VerifyPaymentResponse } from './dto';

// POST /api/v1/payments/verify/ — confirme auprès du backend qu'un paiement
// initié est bien allé au bout, ce qui place l'escrow en HELD et démarre la
// mission.
//
// Point important : en développement, aucun webhook de passerelle n'atteint le
// serveur. Cet appel, déclenché au retour du lien profond, est donc le SEUL
// moyen de clore la boucle — sans lui l'argent resterait indéfiniment en
// INITIATED et la mission ne démarrerait jamais.
async function postVerify(gatewayRef: string): Promise<VerifyPaymentResponse> {
  const res = await apiClient.post<VerifyPaymentResponse>('payments/verify/', {
    gateway_ref: gatewayRef,
  });
  return res.data;
}

export function useVerifyPayment() {
  const qc = useQueryClient();
  return useMutation<VerifyPaymentResponse, Error, string>({
    mutationFn: postVerify,
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: jobDetailKey(data.job_id) });
      void qc.invalidateQueries({ queryKey: ['jobEscrow', data.job_id] });
    },
  });
}
