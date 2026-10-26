/**
 * Dettes de commission, vues par transporteur — écran « Commissions » de l'admin.
 *
 * Pendant le pilote, la commission des courses payées en espèces se règle à la
 * main : le transporteur paie (D17, Flouci, en main propre) et l'administrateur
 * le note ici. Au-delà du plafond, le transporteur ne peut plus publier ni
 * accepter de course ; le règlement le débloque aussitôt.
 */
import { apiClient } from "@/lib/api/client";

export interface LigneDette {
  id: number;
  job_id: number;
  amount: number;
  created_at: string;
}

export interface DetteTransporteur {
  transporter_id: number;
  name: string;
  email: string;
  phone: string | null;
  total: number;
  count: number;
  blocked: boolean;
  oldest_at: string;
  entries: LigneDette[];
}

export interface DettesCommission {
  limit: number;
  results: DetteTransporteur[];
}

export function getDettesCommission(): Promise<DettesCommission> {
  return apiClient.get<DettesCommission>("/api/admin/commission/debts/");
}

/** Règle toute la dette d'un transporteur. `reason` : 10 caractères minimum. */
export function reglerDetteTransporteur(
  transporterId: number,
  reason: string,
): Promise<{ settled_count: number; settled_total: number }> {
  return apiClient.post(
    `/api/admin/commission/transporters/${transporterId}/settle/`,
    { reason },
  );
}
