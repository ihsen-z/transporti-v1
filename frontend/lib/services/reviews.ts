/**
 * Avis — lot 4.2.
 *
 * La LECTURE des avis vit dans `profiles.ts` (ils accompagnent un profil) ;
 * l'ÉCRITURE est ici, parce qu'elle appartient au transport qu'elle note.
 */
import { apiClient } from "@/lib/api/client";
import type { Avis } from "./profiles";

export type { Avis } from "./profiles";

export function submitReview(
  jobId: number,
  note: number,
  commentaire: string,
  aspects: Record<string, number>,
): Promise<unknown> {
  return apiClient.post("/api/reviews/", {
    job_id: jobId,
    rating: note,
    comment: commentaire,
    aspects,
  });
}

/**
 * Les avis REÇUS par l'utilisateur connecté.
 *
 * `reviews/my/` existait depuis longtemps sans aucune interface : c'est
 * l'endpoint que C5.2 consomme enfin.
 *
 * DOUBLE AVEUGLE (blueprint §2.5) : un avis reste masqué tant que les deux
 * parties n'ont pas noté, ou jusqu'à l'expiration d'une fenêtre de sept jours.
 * Le champ `is_revealed` porte cette décision, prise par le SERVEUR. L'écran
 * doit le respecter et ne jamais afficher le contenu d'un avis non révélé —
 * c'est ce qui empêche les représailles de note.
 */
export async function getMyReviews(): Promise<Avis[]> {
  const reponse = await apiClient.get<Avis[] | { results?: Avis[] }>(
    "/api/reviews/my/",
  );
  return Array.isArray(reponse) ? reponse : (reponse.results ?? []);
}

/*
 * PAS de moyenne calculee ici, volontairement.
 *
 * La note moyenne d'un transporteur est K8 (`average_rating`), fournie par
 * `get_transporter_stats()`. La recalculer a partir de la liste donnerait un
 * second chiffre, tot ou tard different — la liste est paginee, filtree par le
 * double aveugle, et n'a jamais vocation a etre exhaustive. Le contrat de
 * `stats.py` est explicite : le frontend ne recalcule JAMAIS.
 */
