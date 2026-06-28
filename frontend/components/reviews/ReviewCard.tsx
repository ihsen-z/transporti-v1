"use client";

import { Star } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Shared ReviewCard — used by both Client & Transporter profiles (SCALE-T2) */
/* -------------------------------------------------------------------------- */

export interface ReviewData {
  id: number;
  rating: number | null;
  comment: string;
  aspects: Record<string, number>;
  reviewer_name: string;
  reviewer_avatar: string | null;
  is_revealed: boolean;
  created_at: string;
}

const ASPECT_LABELS: Record<string, string> = {
  punctuality: "Ponctualité",
  care: "Soin",
  communication: "Communication",
};

interface ReviewCardProps {
  review: ReviewData;
  /** Use 'brand' for transporter profiles, 'amber' for client profiles */
  variant?: "brand" | "amber";
}

export default function ReviewCard({
  review,
  variant = "brand",
}: ReviewCardProps) {
  const r = review;
  const initials = r.reviewer_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const dateLabel = (() => {
    try {
      return new Date(r.created_at).toLocaleDateString("fr-TN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return r.created_at;
    }
  })();

  const gradientClass =
    variant === "amber"
      ? "from-amber-500 to-orange-600"
      : "from-brand-600 to-brand-800";

  const pillBg =
    variant === "amber"
      ? "bg-amber-500/10 text-amber-700"
      : "bg-brand-600/5 text-brand-700";

  return (
    <div className="bg-white rounded-xl border border-neutral-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
          >
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {r.reviewer_name}
            </p>
            <div className="flex items-center gap-0.5 mt-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= (r.rating || 0)
                      ? "text-amber-400 fill-amber-400"
                      : "text-neutral-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        <span className="text-xs text-neutral-400">{dateLabel}</span>
      </div>

      {/* Comment */}
      {r.comment && (
        <p className="text-sm text-neutral-600 mb-3 leading-relaxed">
          &ldquo;{r.comment}&rdquo;
        </p>
      )}

      {/* Aspect pills */}
      {r.aspects &&
        Object.entries(r.aspects).some(([, v]) => v && v > 0) && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(r.aspects).map(([key, value]) => {
              if (!value || value === 0) return null;
              return (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 ${pillBg} rounded-lg text-xs font-semibold`}
                >
                  {ASPECT_LABELS[key] || key}: {value}/5
                </span>
              );
            })}
          </div>
        )}
    </div>
  );
}
