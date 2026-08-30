// Dashboard Data Service
// Production — Real API only

import { apiClient } from "@/lib/api/client";
import type { DashboardStats, UserProfile, ServiceResult } from "./types";

/**
 * Donnees du tableau de bord : role de l'utilisateur et ses statistiques.
 *
 * ATTENTION : `getDashboardStats()` ci-dessous, malgre son nom, interroge
 * `/api/auth/profile/` et non cet endpoint. Les deux coexistaient sans que
 * rien ne le signale ; l'ecran appelait `/api/auth/dashboard/` en direct.
 */
export interface TransportRecent {
  id: number;
  job_type: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_time: string;
  offer_count?: number;
}

export interface StatistiquesClient {
  active_jobs: number;
  total_offers_received: number;
  completed_jobs: number;
  pending_offers: number;
}

export interface StatistiquesTransporteurTableauDeBord {
  available_missions: number;
  active_offers: number;
  completed_jobs: number;
  /** K4 — gains confirmés (escrow libéré), source unique B2 */
  total_earnings: number;
  /** K11 — net des missions livrées en attente de confirmation */
  earnings_pending?: number;
  /** K10 — solde disponible du portefeuille */
  wallet_available?: number;
  verification_status: string;
  average_rating: number | null;
  completion_rate: number | null;
}

/**
 * Le contenu de `stats` DÉPEND du rôle, et l'API le dit par le champ `role`.
 * L'union discriminée reproduit ce contrat : impossible de lire des
 * statistiques de transporteur sur un tableau de bord client sans que le
 * compilateur s'en aperçoive.
 */
export type ResumeTableauDeBord =
  | {
      role?: "CLIENT";
      stats?: StatistiquesClient;
      recent_jobs?: TransportRecent[];
    }
  | {
      role: "TRANSPORTER";
      stats?: StatistiquesTransporteurTableauDeBord;
      recent_jobs?: TransportRecent[];
    };

export async function getDashboardSummary(): Promise<ResumeTableauDeBord> {
  return apiClient.get<ResumeTableauDeBord>("/api/auth/dashboard/");
}

export async function getDashboardStats(): Promise<
  ServiceResult<DashboardStats>
> {
  const data = await apiClient.get<DashboardStats>("/api/auth/profile/");
  return { data, source: "api" };
}

export async function getUserProfile(): Promise<ServiceResult<UserProfile>> {
  const data = await apiClient.get<UserProfile>("/api/auth/profile/");
  return { data, source: "api" };
}
