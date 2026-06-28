import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/client';
import { JobDto, OfferDto } from './jobDto';
import { jobMapper } from './jobMapper';
import { JobModel } from '../domain/jobModel'; // Wait, let's make sure the path is correct: the domain folder is at src/features/jobs/domain/jobModel.ts. Let's fix the path to '../domain/jobModel'

export const useJobsList = (filter: 'public' | 'my' = 'public') => {
  const endpoint = filter === 'my' ? '/jobs/my/' : '/jobs/public/';
  return useQuery<JobModel[]>({
    queryKey: ['jobs', filter],
    queryFn: async () => {
      const response = await apiClient.get<any>(endpoint);
      const data = response.data;
      const list = data && typeof data === 'object' && 'results' in data ? data.results : (Array.isArray(data) ? data : []);
      return jobMapper.toDomainList(list);
    },
  });
};

export const useJobDetail = (jobId: number) => {
  return useQuery<JobModel>({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const response = await apiClient.get<JobDto>(`/jobs/${jobId}/`);
      return jobMapper.toDomain(response.data);
    },
    enabled: !!jobId,
  });
};

export const useCreateJob = () => {
  const queryClient = useQueryClient();
  return useMutation<JobModel, Error, Omit<JobDto, 'id' | 'owner' | 'status' | 'created_at' | 'updated_at' | 'view_count'>>({
    mutationFn: async (newJobData) => {
      const response = await apiClient.post<JobDto>('/jobs/', newJobData);
      return jobMapper.toDomain(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};

export const useJobOffers = (jobId: number) => {
  return useQuery<OfferDto[]>({
    queryKey: ['job-offers', jobId],
    queryFn: async () => {
      const response = await apiClient.get<any>(`/jobs/${jobId}/offers/`);
      const data = response.data;
      const list = data && typeof data === 'object' && 'results' in data ? data.results : (Array.isArray(data) ? data : []);
      return list.map((offer: any) => ({
        ...offer,
        transporter: offer.transporter || {
          id: offer.transporter_id,
          name: offer.transporter_name,
          phone: null,
        },
      }));
    },
    enabled: !!jobId,
  });
};

export const useAcceptOffer = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { offerId: number; payment_method: 'DIGITAL' | 'COD' }>({
    mutationFn: async ({ offerId, payment_method }) => {
      await apiClient.post(`/offers/${offerId}/accept/`, { payment_method });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
      queryClient.invalidateQueries({ queryKey: ['job-offers'] });
    },
  });
};

export const useSubmitOffer = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { job: number; total_price: number; message: string; valid_until: string }>({
    mutationFn: async (offerData) => {
      await apiClient.post('/offers/', offerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job'] });
      queryClient.invalidateQueries({ queryKey: ['job-offers'] });
    },
  });
};

export const useConfirmCompletion = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { job_id: number }>({
    mutationFn: async ({ job_id }) => {
      await apiClient.post('/payments/confirm-completion/', { job_id });
    },
    onSuccess: (_, { job_id }) => {
      queryClient.invalidateQueries({ queryKey: ['job', job_id] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
};
