/**
 * Appels réseau de l'écran de détail d'un transport — lot 4.1.
 *
 * `app/(app)/jobs/[id]/page.tsx` portait ses douze appels API en ligne, au
 * milieu du rendu. Conséquences mesurées : un 404 sur une route inexistante y
 * est resté invisible plusieurs semaines (voir `4a970ba`), et aucun de ces
 * appels n'était atteignable depuis un test sans monter la page entière.
 *
 * Ce module ne contient QUE le réseau. Les toasts, les états de chargement et
 * les dialogues restent dans la page : ce sont des décisions d'interface, pas
 * des appels serveur. Les erreurs remontent telles quelles — c'est l'appelant
 * qui sait quel message afficher.
 */
import { apiClient } from "@/lib/api/client";
import { config } from "@/lib/config";
import { getAccessToken } from "@/lib/api/tokenManager";
import { initiatePayment } from "./bookings";
import type { JobDetail } from "@/lib/types/jobs";

export type MoyenDePaiement = "DIGITAL" | "COD";

/* ------------------------------------------------------------------ */
/*  Lecture                                                            */
/* ------------------------------------------------------------------ */

export function getJobDetail(jobId: number): Promise<JobDetail> {
  return apiClient.get<JobDetail>(`/api/jobs/${jobId}/`);
}

/* ------------------------------------------------------------------ */
/*  Paiement                                                           */
/* ------------------------------------------------------------------ */

/**
 * Confirme aupres du backend le retour de la passerelle (D3).
 *
 * C'est CET appel qui bascule l'escrow en HELD et demarre la mission, y
 * compris en mode bac a sable : le parametre `?payment=success` de l'URL n'est
 * qu'une indication du navigateur, jamais une preuve.
 */
export function verifierPaiement(gatewayRef: string): Promise<unknown> {
  return apiClient.post("/api/payments/verify/", { gateway_ref: gatewayRef });
}

/**
 * Demarre un paiement depuis l'ecran de detail.
 *
 * Delegue a `bookings.ts`, ou vit la definition unique : le meme endpoint
 * etait appele ici avec `platform: "web"` et depuis /reservation sans, sans
 * que rien ne dise laquelle des deux charges utiles faisait foi.
 */
export function initierPaiement(
  jobId: number,
): Promise<{ payment_url?: string }> {
  return initiatePayment(jobId, "web");
}

export function confirmerLivraisonParLeClient(jobId: number): Promise<unknown> {
  return apiClient.post("/api/payments/confirm-completion/", { job_id: jobId });
}

/* ------------------------------------------------------------------ */
/*  Cycle de vie de la mission                                         */
/* ------------------------------------------------------------------ */

export function confirmerDemarrage(jobId: number): Promise<unknown> {
  return apiClient.post(`/api/jobs/${jobId}/confirm-start/`, {});
}

export function enregistrerJalon(
  jobId: number,
  event: "ARRIVED_PICKUP" | "LOADED",
): Promise<unknown> {
  return apiClient.post(`/api/jobs/${jobId}/events/`, { event });
}

export function marquerLivre(
  jobId: number,
  pin: string,
  urlPhotoPreuve: string,
): Promise<unknown> {
  return apiClient.post(`/api/jobs/${jobId}/complete/`, {
    pin,
    pod_photo_url: urlPhotoPreuve,
  });
}

/**
 * Televerse la photo de preuve de livraison, et rend son URL.
 *
 * Passe par `fetch` et non par `apiClient`, qui ne parle que JSON. Rend une
 * chaine vide en cas d'echec : la photo est OPTIONNELLE et ne doit jamais
 * empecher une livraison d'etre enregistree. C'est le seul endroit du module
 * ou une erreur est avalee, et c'est un choix, pas un oubli.
 */
export async function televerserPhotoPreuve(fichier: File): Promise<string> {
  try {
    const corps = new FormData();
    corps.append("photo", fichier);
    const jeton = getAccessToken();
    const reponse = await fetch(`${config.API_BASE_URL}/api/upload/photo/`, {
      method: "POST",
      headers: jeton ? { Authorization: `Bearer ${jeton}` } : undefined,
      body: corps,
    });
    if (!reponse.ok) return "";
    const corpsJson = (await reponse.json()) as {
      url?: string;
      photo_url?: string;
    };
    return corpsJson?.url || corpsJson?.photo_url || "";
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ */
/*  Annulations                                                        */
/* ------------------------------------------------------------------ */

export function annulerParLeClient(jobId: number): Promise<unknown> {
  return apiClient.post(`/api/jobs/${jobId}/cancel/`, {});
}

export function annulerParLeTransporteur(
  jobId: number,
  motif: string,
): Promise<unknown> {
  return apiClient.post(`/api/jobs/${jobId}/transporter-cancel/`, {
    reason: motif,
  });
}

/* ------------------------------------------------------------------ */
/*  Trajets retour — reservation et demandes structurees               */
/* ------------------------------------------------------------------ */

export function reserverTrajetRetour(
  jobId: number,
  prix: string,
  paiement: MoyenDePaiement,
): Promise<unknown> {
  return apiClient.post(`/api/jobs/${jobId}/book-return/`, {
    proposed_price: prix,
    payment_method: paiement,
  });
}

export function envoyerDemandeSurTrajet(
  jobId: number,
  description: string,
  prix: string,
  paiement: MoyenDePaiement,
): Promise<unknown> {
  return apiClient.post(`/api/jobs/${jobId}/requests/`, {
    description,
    proposed_price: prix,
    payment_method: paiement,
  });
}

/** Ce que rend `accept-counter/` : l'offre creee porte l'identifiant qu'exige
 *  l'ecran de paiement. Sans lui, /jobs/<id>/book affiche « introuvable ». */
export interface ReponseAcceptationContreProposition {
  job?: { accepted_transporter?: { offer_id?: number } | null };
}

export function accepterContreProposition(
  requestId: number,
): Promise<ReponseAcceptationContreProposition> {
  return apiClient.post<ReponseAcceptationContreProposition>(
    `/api/trip-requests/${requestId}/accept-counter/`,
    {},
  );
}

export function annulerDemandeSurTrajet(requestId: number): Promise<unknown> {
  return apiClient.post(`/api/trip-requests/${requestId}/cancel/`, {});
}
