import { DisputeDto } from './disputeDto';
import { DisputeModel, DisputeReason, DisputeStatus, JobSummary } from '../domain/disputeModel';

export const disputeMapper = {
  toDomain(dto: DisputeDto): DisputeModel {
    return new DisputeModel(
      dto.id,
      dto.job,
      dto.reason as DisputeReason,
      dto.description,
      dto.status as DisputeStatus,
      dto.resolution_notes,
      dto.opened_by_name || 'Utilisateur',
      dto.job_summary
        ? {
            id: dto.job_summary.id,
            type: dto.job_summary.type,
            status: dto.job_summary.status,
            pickup: dto.job_summary.pickup,
            dropoff: dto.job_summary.dropoff,
          }
        : null,
      new Date(dto.created_at),
      new Date(dto.updated_at),
      dto.resolved_at ? new Date(dto.resolved_at) : null
    );
  },

  toDomainList(dtos: DisputeDto[]): DisputeModel[] {
    return dtos.map((dto) => this.toDomain(dto));
  },
};
