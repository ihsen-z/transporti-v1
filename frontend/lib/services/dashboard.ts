// Dashboard Data Service
// Production — Real API only

import { apiClient } from '@/lib/api/client';
import {
    type DashboardStats,
    type UserProfile,
} from '@/lib/dashboard';
import type { ServiceResult } from './types';

export async function getDashboardStats(): Promise<ServiceResult<DashboardStats>> {
    const data = await apiClient.get<DashboardStats>('/api/auth/profile/');
    return { data, source: 'api' };
}

export async function getUserProfile(): Promise<ServiceResult<UserProfile>> {
    const data = await apiClient.get<UserProfile>('/api/auth/profile/');
    return { data, source: 'api' };
}
