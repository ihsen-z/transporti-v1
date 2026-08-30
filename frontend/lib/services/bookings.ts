/**
 * Réservation, escrow et initiation de paiement — lot 4.2.
 *
 * L'écran `/reservation/[jobId]` déclarait `BookingData`, `JobData` et
 * `EscrowData`… puis appelait l'API en `any`. Les types étaient écrits et
 * ignorés : le pire des deux mondes, puisqu'ils donnaient l'illusion d'un
 * contrat vérifié.
 */
import { apiClient } from "@/lib/api/client";

export interface Reservation {
  id: number;
  job: number;
  final_price: string;
  commission_rate: string;
  payment_method: "DIGITAL" | "COD";
  cod_allowed: boolean;
  created_at: string;
  accepted_offer: number;
}

export interface TransportReserve {
  id: number;
  job_type: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_governorate: string;
  dropoff_governorate: string;
  scheduled_date: string;
  accepted_transporter?: {
    name: string;
    phone?: string;
    total_price: number;
  };
  owner?: {
    id: number;
  };
}

export interface Escrow {
  id: number;
  status: string;
  amount: string;
  created_at: string;
}

export function getReservedJob(jobId: number): Promise<TransportReserve> {
  return apiClient.get<TransportReserve>(`/api/jobs/${jobId}/`);
}

/**
 * La réservation d'un transport, ou `null` s'il n'y en a pas encore.
 *
 * L'absence est un état NORMAL : un transport attribué n'est pas encore payé.
 * L'échec est donc traduit en `null` plutôt que propagé — mais seulement ici,
 * là où l'absence a un sens.
 */
export async function getBooking(jobId: number): Promise<Reservation | null> {
  try {
    return await apiClient.get<Reservation>(`/api/jobs/${jobId}/booking/`);
  } catch {
    return null;
  }
}

/** L'escrow du transport, ou `null`. Même raisonnement que la réservation. */
export async function getEscrow(jobId: number): Promise<Escrow | null> {
  try {
    const reponse = await apiClient.get<Escrow[] | { results?: Escrow[] }>(
      `/api/jobs/${jobId}/escrow/`,
    );
    if (Array.isArray(reponse)) return reponse[0] ?? null;
    return reponse.results?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Démarre un paiement et rend l'URL de la passerelle.
 *
 * DÉFINITION UNIQUE : cet appel existait en double, dans l'écran de détail
 * (avec `platform: "web"`) et dans l'écran de réservation (sans). Deux charges
 * utiles différentes sur le même endpoint, sans que rien ne dise laquelle
 * faisait foi. Le paramètre est ici explicite et les deux appelants passent
 * par cette fonction.
 */
export function initiatePayment(
  jobId: number,
  plateforme?: "web",
): Promise<{ payment_url?: string }> {
  return apiClient.post<{ payment_url?: string }>("/api/payments/initiate/", {
    job_id: jobId,
    ...(plateforme ? { platform: plateforme } : {}),
  });
}
