import React from "react";
import { Star, ThumbsUp, Calendar } from "lucide-react";
import { formatDate } from "@/lib/format";

/* -------------------------------------------------------------------------- */
/*  ReviewDisplay — Single review card with aspects + recommendation          */
/* -------------------------------------------------------------------------- */

interface ReviewDisplayProps {
  review: {
    id: number;
    reviewer_name: string;
    reviewer_role: "CLIENT" | "TRANSPORTER";
    rating: number;
    comment: string;
    aspects?: {
      punctuality?: number;
      care?: number;
      communication?: number;
    };
    would_recommend?: boolean;
    created_at: string;
  };
}

const ASPECT_LABELS: Record<string, string> = {
  punctuality: "Ponctualité",
  care: "Soin & Attention",
  communication: "Communication",
};

export function ReviewDisplay({ review }: ReviewDisplayProps) {
  const r = review;

  const renderStars = (rating: number, size: "sm" | "xs" = "sm") => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size === "sm" ? "w-4 h-4" : "w-3 h-3"} ${
            star <= rating
              ? "text-amber-400 fill-amber-400"
              : "text-neutral-200"
          }`}
        />
      ))}
    </div>
  );

  const dateLabel = (() => {
    try {
      return formatDate(r.created_at, undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return r.created_at;
    }
  })();

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {r.reviewer_name[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {r.reviewer_name}
            </p>
            <p className="text-xs text-neutral-400">
              {r.reviewer_role === "CLIENT" ? "Client" : "Transporteur"}
            </p>
          </div>
        </div>
        <div className="text-end">
          {renderStars(r.rating)}
          <p className="text-[10px] text-neutral-400 mt-1 flex items-center gap-1 justify-end">
            <Calendar className="w-3 h-3" />
            {dateLabel}
          </p>
        </div>
      </div>

      {/* Comment */}
      {r.comment && (
        <p className="text-sm text-neutral-700 mb-3 leading-relaxed">
          &ldquo;{r.comment}&rdquo;
        </p>
      )}

      {/* Aspects */}
      {r.aspects && Object.entries(r.aspects).some(([, v]) => v && v > 0) && (
        <div className="flex flex-wrap gap-4 mb-3">
          {Object.entries(r.aspects).map(([key, value]) => {
            if (!value || value === 0) return null;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-500">
                  {ASPECT_LABELS[key] || key}
                </span>
                {renderStars(value, "xs")}
              </div>
            );
          })}
        </div>
      )}

      {/* Recommendation */}
      {r.would_recommend !== undefined && (
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            r.would_recommend
              ? "bg-emerald-50 text-emerald-700"
              : "bg-neutral-100 text-neutral-500"
          }`}
        >
          <ThumbsUp
            className={`w-3.5 h-3.5 ${r.would_recommend ? "" : "rotate-180"}`}
          />
          {r.would_recommend ? "Recommande" : "Ne recommande pas"}
        </div>
      )}
    </div>
  );
}
