/**
 * Litiges — lot 4.2.
 *
 * L'écran `/litiges` portait ses trois appels en ligne, et deux d'entre eux
 * étaient typés `any` : le `?? []` sur une réponse de forme inconnue masquait
 * aussi bien une page vide qu'un contrat rompu.
 *
 * Ici, les formes sont déclarées et la normalisation « tableau ou page
 * paginée » se fait à UN seul endroit, au lieu d'être recopiée à chaque appel.
 */
import { apiClient } from "@/lib/api/client";
import type { PaginatedResponse } from "./types";

/** Statuts d'un transport sur lesquels un litige peut être ouvert. */
export const STATUTS_ELIGIBLES_AU_LITIGE = [
  "IN_PROGRESS",
  "COMPLETED",
  "CONFIRMED",
] as const;

export interface Dispute {
  id: number;
  job: number;
  reason: string;
  description: string;
  status: string;
  resolution_notes: string | null;
  opened_by_name: string;
  job_summary: {
    id: number;
    type: string;
    status: string;
    pickup?: string;
    dropoff?: string;
  };
  created_at: string;
  updated_at: string;
}

/** Transport tel qu'affiché dans le sélecteur d'ouverture d'un litige. */
export interface TransportEligible {
  id: number;
  job_type: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_governorate?: string;
  dropoff_governorate?: string;
  created_at: string;
}

/** Déplie une réponse paginée ou un tableau nu. */
function liste<T>(reponse: PaginatedResponse<T> | T[]): T[] {
  return Array.isArray(reponse) ? reponse : (reponse.results ?? []);
}

export async function getMyDisputes(): Promise<Dispute[]> {
  return liste(
    await apiClient.get<PaginatedResponse<Dispute> | Dispute[]>(
      "/api/disputes/my/",
    ),
  );
}

/**
 * Les transports sur lesquels l'utilisateur peut ouvrir un litige.
 *
 * L'endpoint dépend du rôle : un transporteur lit ses missions, un client ses
 * demandes. Le filtre sur les statuts éligibles est appliqué ici et non dans
 * l'écran — c'est une règle métier, pas une préférence d'affichage.
 */
export async function getDisputableJobs(
  estTransporteur: boolean,
): Promise<TransportEligible[]> {
  const endpoint = estTransporteur ? "/api/jobs/transporter/" : "/api/jobs/my/";
  const transports = liste(
    await apiClient.get<
      PaginatedResponse<TransportEligible> | TransportEligible[]
    >(endpoint),
  );
  return transports.filter((t) =>
    (STATUTS_ELIGIBLES_AU_LITIGE as readonly string[]).includes(t.status),
  );
}

export function createDispute(
  jobId: number,
  reason: string,
  description: string,
): Promise<unknown> {
  return apiClient.post("/api/disputes/", {
    // Le backend attend `job_id`, pas `job` : le nom du champ a deja cause un
    // 400 silencieux.
    job_id: jobId,
    reason,
    description,
  });
}
