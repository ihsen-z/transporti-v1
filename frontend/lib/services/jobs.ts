// Jobs Data Service
// Production — Real API only

import { apiClient } from '@/lib/api/client';
import type { Job, ServiceResult, PaginatedResponse } from './types';

export type { DataSource } from './types';

/** Transporter mission shape from GET /api/jobs/transporter/ */
export interface TransporterMission {
    id: number;
    job_type: 'TRANSPORT' | 'MOVING';
    status: 'PUBLISHED' | 'MATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
    pickup_address: string;
    pickup_governorate: string;
    dropoff_address: string;
    dropoff_governorate: string;
    scheduled_time: string;
    description: string;
    client_name: string;
    offer_price: number;
    offer_price_net: number;
    offer_commission: number;
    is_return_trip: boolean;
    available_capacity: string;
    created_at: string;
    updated_at: string;
}

export async function getJobs(): Promise<ServiceResult<Job[]>> {
    const response = await apiClient.get<PaginatedResponse<Job>>('/api/jobs/my/');
    return { data: response.results ?? response as unknown as Job[], source: 'api' };
}

export async function getJobById(id: number): Promise<ServiceResult<Job | null>> {
    const data = await apiClient.get<Job>(`/api/jobs/${id}/`);
    return { data, source: 'api' };
}

export async function getTransporterMissions(): Promise<ServiceResult<TransporterMission[]>> {
    const response = await apiClient.get<PaginatedResponse<TransporterMission> | TransporterMission[]>('/api/jobs/transporter/');
    const list = Array.isArray(response) ? response : (response.results ?? []);
    return { data: list, source: 'api' };
}

export async function createReturnTrip(data: Record<string, unknown>): Promise<unknown> {
    return apiClient.post('/api/jobs/return-trip/', data);
}
