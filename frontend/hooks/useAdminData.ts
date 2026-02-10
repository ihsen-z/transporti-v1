'use client';

// Admin Data Hooks
// Sprint 7.5 — API Transition Layer

import { useCallback } from 'react';
import { useDataService } from './useDataService';
import {
    getAdminStats,
    getAdminJobs,
    getAdminUsers,
    getAdminPayments,
    getActivityLogs,
    getSystemAlerts,
} from '@/lib/services/admin';
import {
    mockAdminStats,
    mockAdminJobs,
    mockAdminUsers,
    mockAdminPayments,
    mockActivityLogs,
    mockSystemAlerts,
    type AdminStats,
    type AdminJob,
    type AdminUser,
    type AdminPayment,
    type ActivityLog,
    type SystemAlert,
} from '@/lib/admin';

export function useAdminStats() {
    const fetcher = useCallback(() => getAdminStats(), []);
    return useDataService<AdminStats>(fetcher, mockAdminStats);
}

export function useAdminJobs() {
    const fetcher = useCallback(() => getAdminJobs(), []);
    return useDataService<AdminJob[]>(fetcher, []);
}

export function useAdminUsers() {
    const fetcher = useCallback(() => getAdminUsers(), []);
    return useDataService<AdminUser[]>(fetcher, []);
}

export function useAdminPayments() {
    const fetcher = useCallback(() => getAdminPayments(), []);
    return useDataService<AdminPayment[]>(fetcher, []);
}

export function useActivityLogs() {
    const fetcher = useCallback(() => getActivityLogs(), []);
    return useDataService<ActivityLog[]>(fetcher, []);
}

export function useSystemAlerts() {
    const fetcher = useCallback(() => getSystemAlerts(), []);
    return useDataService<SystemAlert[]>(fetcher, []);
}
