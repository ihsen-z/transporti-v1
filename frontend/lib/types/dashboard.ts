/* -------------------------------------------------------------------------- */
/*  Dashboard response types — mirroring DashboardStatsView                   */
/*  Source: backend/users/views.py DashboardStatsView                         */
/* -------------------------------------------------------------------------- */

/** Client dashboard stats (from DashboardStatsView L212-221) */
export interface ClientDashboardStats {
  total_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  pending_offers: number;
  total_spent: number;
  avg_rating_received: number;
}

/** Transporter dashboard stats (from DashboardStatsView L265-277) */
export interface TransporterDashboardStats {
  total_offers: number;
  accepted_offers: number;
  active_jobs: number;
  completed_jobs: number;
  total_earned: number;
  avg_rating: number;
  pending_payouts: number;
}

/** Union type for role-aware dashboard */
export type DashboardStats = ClientDashboardStats | TransporterDashboardStats;

/** Shape returned by GET /api/auth/dashboard/ */
export interface DashboardResponse {
  stats: DashboardStats;
  recent_jobs: Array<{
    id: number;
    title: string;
    status: string;
    budget: string | null;
    created_at: string;
  }>;
}
