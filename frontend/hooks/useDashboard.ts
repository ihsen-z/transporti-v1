"use client";

// Dashboard Hook — Production, real API only

import { useCallback } from "react";
import { useDataService } from "./useDataService";
import { getDashboardStats, getUserProfile } from "@/lib/services/dashboard";
import { type DashboardStats, type UserProfile } from "@/lib/dashboard";

const emptyStats: DashboardStats = {
  totalJobs: 0,
  completedJobs: 0,
  averageRating: 0,
  balance: 0,
};
const emptyProfile: UserProfile = {
  name: "",
  email: "",
  role: "CLIENT",
  trust_score: 0,
  trust_level: "NEW",
};

export function useDashboardStats() {
  const fetcher = useCallback(() => getDashboardStats(), []);
  return useDataService<DashboardStats>(fetcher, emptyStats);
}

export function useUserProfile() {
  const fetcher = useCallback(() => getUserProfile(), []);
  return useDataService<UserProfile>(fetcher, emptyProfile);
}
