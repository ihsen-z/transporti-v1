import React, { useState } from "react";
import { Star, Send } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";

interface ReviewFormProps {
  jobId: number;
  onReviewSubmitted: () => void;
}

export function ReviewForm({ jobId, onReviewSubmitted }: ReviewFormProps) {
  const { showToast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [aspects, setAspects] = useState({
    punctuality: 0,
    care: 0,
    communication: 0,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      showToast("warning", "Veuillez donner une note globale.");
      return;
    }

    setLoading(true);

    try {
      await apiClient.post("/api/reviews/", {
        job_id: jobId,
        rating,
        comment,
        aspects,
      });

      onReviewSubmitted();
      showToast("success", "Merci pour votre avis !");
    } catch (error: any) {
      console.error("Error submitting review:", error);
      const msg =
        error?.body?.non_field_errors?.[0] ||
        error?.body?.detail ||
        error?.message ||
        "Erreur lors de l'envoi.";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({
    value,
    onChange,
    size = "md",
  }: {
    value: number;
    onChange: (v: number) => void;
    size?: "sm" | "md";
  }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`focus:outline-none transition-colors ${
            star <= value ? "text-amber-400" : "text-neutral-300"
          }`}
        >
          <Star
            className={`${size === "md" ? "w-8 h-8" : "w-5 h-5"} fill-current`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm">
      <h3 className="text-lg font-bold text-neutral-900 mb-6">
        Laisser un avis
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Note globale
          </label>
          <StarRating value={rating} onChange={setRating} />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-neutral-700">
            Détails (Optionnel)
          </p>

          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Ponctualité</span>
            <StarRating
              value={aspects.punctuality}
              onChange={(v) => setAspects((p) => ({ ...p, punctuality: v }))}
              size="sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Soin & Attention</span>
            <StarRating
              value={aspects.care}
              onChange={(v) => setAspects((p) => ({ ...p, care: v }))}
              size="sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">Communication</span>
            <StarRating
              value={aspects.communication}
              onChange={(v) => setAspects((p) => ({ ...p, communication: v }))}
              size="sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Commentaire
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-3 border rounded-xl h-24 focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none"
            placeholder="Partagez votre expérience..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            "Envoi..."
          ) : (
            <>
              Envoyer l'avis <Send className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
