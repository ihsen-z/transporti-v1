/**
 * Vérification d'identité et documents — lot 4.2.
 *
 * Les appels vivaient dans DEUX endroits sans se connaître : l'écran
 * `/documents` lisait le statut et la liste, le composant `VerificationUpload`
 * téléversait. Le second ignorait donc les règles du premier.
 */
import { apiClient } from "@/lib/api/client";

export interface DocumentDeVerification {
  id: number;
  document_type: string;
  file_url: string;
  is_valid: boolean;
  uploaded_at: string;
  rejection_reason: string | null;
  reviewed_at: string | null;
  /** WS-H — expiration calculée CÔTÉ SERVEUR, jamais recalculée ici. */
  expires_at: string | null;
  is_expired: boolean;
  expires_soon: boolean;
}

/**
 * Statut de vérification.
 *
 * Retombe sur `UNVERIFIED` en cas d'échec, et c'est le repli SÛR : un statut
 * inconnu ne doit jamais être pris pour une vérification acquise.
 */
export async function getVerificationStatus(): Promise<string> {
  try {
    const reponse = await apiClient.get<{ verification_status: string }>(
      "/api/trust/status/",
    );
    return reponse.verification_status;
  } catch {
    return "UNVERIFIED";
  }
}

export function getVerificationDocuments(): Promise<DocumentDeVerification[]> {
  return apiClient.get<DocumentDeVerification[]>("/api/trust/documents/");
}

export function uploadVerificationDocument(corps: FormData): Promise<unknown> {
  return apiClient.upload("/api/trust/documents/", corps);
}

export function submitForReview(): Promise<unknown> {
  return apiClient.put("/api/trust/submit/", {});
}

/* ------------------------------------------------------------------ */
/*  T5.3 — la décomposition du score de confiance                      */
/* ------------------------------------------------------------------ */

export interface ComposanteDuScore {
  key: "completion" | "disputes" | "payment" | "engagement" | "recency";
  earned: number;
  max: number;
  /**
   * `false` pour les composantes qui mesurent l'USAGE DE L'APPLICATION et non
   * la qualité du service. L'interface s'en sert pour ne pas présenter
   * « connecte-toi plus souvent » comme un levier de fiabilité.
   */
  is_service_quality: boolean;
}

export interface ScoreDeConfiance {
  trust_score: number;
  components: ComposanteDuScore[];
}

/**
 * Le score de l'utilisateur CONNECTÉ et sa décomposition.
 *
 * Strictement personnel : aucun identifiant en paramètre. Le total est déjà
 * public sur les profils ; le détail ne l'est pas, et n'a pas à l'être.
 *
 * `null` en cas d'échec : la section est alors tue, plutôt que de montrer un
 * score à zéro qui se lirait comme une sanction.
 */
export async function getMyTrustScore(): Promise<ScoreDeConfiance | null> {
  try {
    return await apiClient.get<ScoreDeConfiance>("/api/trust/score-breakdown/");
  } catch {
    return null;
  }
}
