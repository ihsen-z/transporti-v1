import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { EstimatePriceRequest, EstimatePriceResponse } from './dto';

// Estimation de prix serveur (D1 : le mobile AFFICHE, ne recalcule jamais).
async function postEstimate(
  body: EstimatePriceRequest,
): Promise<EstimatePriceResponse> {
  const res = await apiClient.post<EstimatePriceResponse>(
    'jobs/estimate-price/',
    body,
  );
  return res.data;
}

export function useEstimatePrice() {
  return useMutation<EstimatePriceResponse, Error, EstimatePriceRequest>({
    mutationFn: postEstimate,
  });
}
