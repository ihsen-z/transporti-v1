"use client";

// Admin Data Hooks — Production, real API only

import { useCallback } from "react";
import { useDataService } from "./useDataService";
import {
  getAdminStats,
  getAdminJobs,
  getAdminUsers,
  getAdminPayments,
  getActivityLogs,
  getSystemAlerts,
  getAdminDisputes,
  getAdminVerifications,
  getAdminReviews,
  getAdminProfiles,
  type BackendDispute,
  type BackendVerification,
  type BackendReview,
  type AdminTrustProfile,
} from "@/lib/services/admin";
import {
  type AdminStats,
  type AdminJob,
  type AdminUser,
  type AdminPayment,
  type ActivityLog,
  type SystemAlert,
} from "@/lib/admin";

const emptyStats: AdminStats = {
  totalUsers: 0,
  activeUsers: 0,
  totalTransporters: 0,
  verifiedTransporters: 0,
  activeJobs: 0,
  completedJobs: 0,
  pendingJobs: 0,
  cancelledJobs: 0,
  totalEscrow: 0,
  pendingEscrow: 0,
  blockedEscrow: 0,
  releasedEscrow: 0,
  platformRevenue: 0,
  activeDisputes: 0,
  avgTrustScore: 0,
};

export function useAdminStats() {
  const fetcher = useCallback(() => getAdminStats(), []);
  return useDataService<AdminStats>(fetcher, emptyStats);
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

export function useAdminDisputes() {
  const fetcher = useCallback(() => getAdminDisputes(), []);
  return useDataService<BackendDispute[]>(fetcher, []);
}

export function useAdminVerifications() {
  const fetcher = useCallback(() => getAdminVerifications(), []);
  return useDataService<BackendVerification[]>(fetcher, []);
}

export function useAdminReviews() {
  const fetcher = useCallback(() => getAdminReviews(), []);
  return useDataService<BackendReview[]>(fetcher, []);
}

export function useAdminProfiles() {
  const fetcher = useCallback(() => getAdminProfiles(), []);
  return useDataService<AdminTrustProfile[]>(fetcher, []);
}
