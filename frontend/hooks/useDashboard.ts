'use client';

// Dashboard Hook
// Sprint 7.5 — API Transition Layer

import { useCallback } from 'react';
import { useDataService } from './useDataService';
import { getDashboardStats, getUserProfile } from '@/lib/services/dashboard';
import { mockDashboardStats, mockUserProfile, type DashboardStats, type UserProfile } from '@/lib/dashboard';

export function useDashboardStats() {
    const fetcher = useCallback(() => getDashboardStats(), []);
    return useDataService<DashboardStats>(fetcher, mockDashboardStats);
}

export function useUserProfile() {
    const fetcher = useCallback(() => getUserProfile(), []);
    return useDataService<UserProfile>(fetcher, mockUserProfile);
}
