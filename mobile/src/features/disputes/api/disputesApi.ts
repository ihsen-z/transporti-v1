import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/client';
import { DisputeDto } from './disputeDto';
import { disputeMapper } from './disputeMapper';
import { DisputeModel } from '../domain/disputeModel';
import { jobMapper } from '../../jobs/api/jobMapper';
import { JobModel } from '../../jobs/domain/jobModel';
import { JobDto } from '../../jobs/api/jobDto';

export const useMyDisputes = () => {
  return useQuery<DisputeModel[]>({
    queryKey: ['myDisputes'],
    queryFn: async () => {
      const response = await apiClient.get<any>('/disputes/my/');
      const data = response.data;
      const list = data.results ?? (Array.isArray(data) ? data : []);
      return disputeMapper.toDomainList(list);
    },
  });
};

export const useCreateDispute = () => {
  const queryClient = useQueryClient();
  return useMutation<DisputeModel, Error, { job_id: number; reason: string; description: string }>({
    mutationFn: async (payload) => {
      const response = await apiClient.post<any>('/disputes/', payload);
      // Backend returns { message: "...", dispute: DisputeDto }
      const disputeDto = response.data.dispute;
      return disputeMapper.toDomain(disputeDto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDisputes'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
    },
  });
};

export const useEligibleJobs = (userRole?: string) => {
  const isTransporter = userRole?.toUpperCase() === 'TRANSPORTER';
  const endpoint = isTransporter ? '/jobs/transporter/' : '/jobs/my/';
  
  return useQuery<JobModel[]>({
    queryKey: ['eligibleJobsForDispute', userRole],
    queryFn: async () => {
      const response = await apiClient.get<any>(endpoint);
      const data = response.data;
      const list = data.results ?? (Array.isArray(data) ? data : []);
      
      // Filter jobs that are IN_PROGRESS, COMPLETED, or CONFIRMED
      const allJobs = jobMapper.toDomainList(list);
      return allJobs.filter((job) =>
        ['IN_PROGRESS', 'COMPLETED'].includes(job.status)
      );
    },
    enabled: !!userRole,
  });
};
