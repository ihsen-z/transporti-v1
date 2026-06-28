import { TrustProfileDto } from './trustDto';
import { TrustModel } from '../domain/trustModel';

export const trustMapper = {
  toDomain: (dto: TrustProfileDto): TrustModel => {
    return new TrustModel(
      dto.id,
      dto.user,
      dto.verification_status,
      dto.trust_score || 0,
      dto.rejection_reason || null,
      dto.vehicle_type || '',
      dto.vehicle_capacity_kg ? Number(dto.vehicle_capacity_kg) : null,
      dto.vehicle_plate || '',
      dto.insurance_valid_until ? new Date(dto.insurance_valid_until) : null
    );
  },
};
