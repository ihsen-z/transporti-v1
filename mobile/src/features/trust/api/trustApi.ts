import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/client';
import { TrustProfileDto } from './trustDto';
import { trustMapper } from './trustMapper';
import { TrustModel } from '../domain/trustModel';

export const useTrustProfile = () => {
  return useQuery<TrustModel>({
    queryKey: ['trustProfile'],
    queryFn: async () => {
      const response = await apiClient.get<TrustProfileDto>('/trust/status/');
      return trustMapper.toDomain(response.data);
    },
  });
};

export const useSubmitVerification = () => {
  const queryClient = useQueryClient();
  return useMutation<TrustModel, Error, {
    vehicle_type: string;
    vehicle_capacity_kg: string;
    vehicle_plate: string;
  }>({
    mutationFn: async (payload) => {
      const response = await apiClient.post<TrustProfileDto>('/trust/submit/', payload);
      return trustMapper.toDomain(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trustProfile'] });
    },
  });
};
