import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/client';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalTransporters: number;
  verifiedTransporters: number;
  activeJobs: number;
  completedJobs: number;
  pendingJobs: number;
  cancelledJobs: number;
  totalEscrow: number;
  pendingEscrow: number;
  blockedEscrow: number;
  releasedEscrow: number;
  platformRevenue: number;
  activeDisputes: number;
  avgTrustScore: number;
}

export const useAdminStats = () => {
  return useQuery<AdminStats>({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const baseUrl = apiClient.defaults.baseURL || 'http://localhost:8000/api/v1';
      const adminStatsUrl = `${baseUrl.replace('/v1', '')}/admin/stats/`;
      const response = await apiClient.get<AdminStats>(adminStatsUrl);
      return response.data;
    },
  });
};
