import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/client';

export interface ClientDashboardMetrics {
  role: 'CLIENT';
  total_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  total_spent: number;
  avg_rating_given: number;
  favorite_transporters: number;
}

export interface TransporterDashboardMetrics {
  role: 'TRANSPORTER';
  total_offers: number;
  accepted_offers: number;
  completed_missions: number;
  acceptance_rate: number;
  total_earned: number;
  avg_rating: number;
  review_count: number;
}

export type DashboardMetrics = ClientDashboardMetrics | TransporterDashboardMetrics;

export const useDashboardMetrics = () => {
  return useQuery<DashboardMetrics>({
    queryKey: ['dashboardMetrics'],
    queryFn: async () => {
      const response = await apiClient.get<DashboardMetrics>('/metrics/dashboard/');
      return response.data;
    },
  });
};
