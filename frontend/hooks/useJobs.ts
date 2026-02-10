'use client';

// Jobs Hook
// Sprint 7.5 — API Transition Layer

import { useCallback } from 'react';
import { useDataService } from './useDataService';
import { getJobs, getJobById } from '@/lib/services/jobs';
import { mockRecentJobs, type Job } from '@/lib/dashboard';

export function useJobs() {
    const fetcher = useCallback(() => getJobs(), []);
    return useDataService<Job[]>(fetcher, []);
}

export function useJobById(id: number) {
    const fetcher = useCallback(() => getJobById(id), [id]);
    return useDataService<Job | null>(fetcher, null);
}
