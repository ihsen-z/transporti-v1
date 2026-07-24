import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { Paginated, TransporterTripDto } from './dto';

// GET /api/v1/jobs/transporter/ — inclut les retours créés par le transporteur.
// On ne garde que les retours PUBLIÉS (seuls à pouvoir recevoir des demandes).
async function fetchMyReturnTrips(): Promise<TransporterTripDto[]> {
  const res = await apiClient.get<Paginated<TransporterTripDto>>(
    'jobs/transporter/',
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
