import { JobDto } from './jobDto';
import { JobModel } from '../domain/jobModel';

export const jobMapper = {
  toDomain: (dto: JobDto): JobModel => {
    return new JobModel(
      dto.id,
      dto.owner,
      dto.owner_name || 'Client',
      dto.status,
      dto.job_type,
      dto.pickup_address,
      dto.pickup_lat !== null ? Number(dto.pickup_lat) : null,
      dto.pickup_lng !== null ? Number(dto.pickup_lng) : null,
      dto.dropoff_address,
      dto.dropoff_lat !== null ? Number(dto.dropoff_lat) : null,
      dto.dropoff_lng !== null ? Number(dto.dropoff_lng) : null,
      new Date(dto.scheduled_time),
      dto.specifications,
      dto.price_tnd_min !== null ? Number(dto.price_tnd_min) : null,
      dto.price_tnd_max !== null ? Number(dto.price_tnd_max) : null,
      dto.description || '',
      dto.photos || [],
      dto.pickup_governorate || '',
      dto.dropoff_governorate || '',
      dto.pickup_hint || '',
      dto.dropoff_hint || '',
      dto.is_return_trip,
      dto.available_capacity || '',
      dto.view_count || 0,
      new Date(dto.created_at),
      new Date(dto.updated_at)
    );
  },

  toDomainList: (dtos: JobDto[]): JobModel[] => {
    return dtos.map(jobMapper.toDomain);
  },
};
