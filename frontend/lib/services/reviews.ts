/**
 * Avis — lot 4.2.
 *
 * La LECTURE des avis vit dans `profiles.ts` (ils accompagnent un profil) ;
 * l'ÉCRITURE est ici, parce qu'elle appartient au transport qu'elle note.
 */
import { apiClient } from "@/lib/api/client";

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
