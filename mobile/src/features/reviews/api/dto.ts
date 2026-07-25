// Contrats avis. Source : backend/reviews/{views,serializers,models}.py.
// Notation bidirectionnelle (client<->transporteur), 1 avis par (job, rôle),
// uniquement sur job COMPLETED, double-aveugle (rating masqué tant que les 2
// parties n'ont pas noté ou < 7 jours).

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// POST reviews/ — le rôle est inféré serveur (participation au job).
export interface CreateReviewBody {
  job_id: number;
  rating: number; // 1..5
  comment: string;
}

// ReviewListSerializer (avis reçus). rating null quand masqué (double-aveugle).
export interface ReviewDto {
  id: number;
  rating: number | null;
  comment: string;
  aspects: Record<string, unknown>;
  reviewer_name: string;
  reviewer_avatar: string | null;
  is_revealed: boolean;
  created_at: string;
}
