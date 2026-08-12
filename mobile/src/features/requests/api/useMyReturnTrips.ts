import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { Paginated, TransporterTripDto } from './dto';

// GET /api/v1/jobs/transporter/?type=owned — les retours créés par le
// transporteur. On ne garde que les PUBLIÉS (seuls à pouvoir recevoir des
// demandes). Bug 5.1 : `?type=owned` (livré en 0.9) isole ce sous-ensemble au
// lieu de l'union paginée à 20 avec les missions assignées, qui pouvait
// reléguer des retours publiés hors de la première page.
async function fetchMyReturnTrips(): Promise<TransporterTripDto[]> {
  const res = await apiClient.get<Paginated<TransporterTripDto>>(
    'jobs/transporter/',
    { params: { type: 'owned' } },
  );
  return res.data.results.filter(
    (t) => t.is_return_trip && t.status === 'PUBLISHED',
  );
}

export function useMyReturnTrips() {
  return useQuery({
    queryKey: ['myReturnTrips'],
    queryFn: fetchMyReturnTrips,
  });
}
