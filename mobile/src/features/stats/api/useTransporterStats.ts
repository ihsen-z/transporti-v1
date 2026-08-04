import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import type { TransporterStatsDto } from './dto';

// GET /api/v1/transporter/stats/ — KPI canoniques K1–K12 (TRANSPORTER).
async function fetchTransporterStats(): Promise<TransporterStatsDto> {
  const res = await apiClient.get<TransporterStatsDto>('transporter/stats/');
  return res.data;
}

// `enabled` doit valoir `false` pour un CLIENT : la vue est protégée par
// RequireRole('TRANSPORTER') et répondrait 403.
export function useTransporterStats(enabled: boolean) {
  return useQuery({
    queryKey: ['transporterStats'],
    queryFn: fetchTransporterStats,
    enabled,
  });
}
