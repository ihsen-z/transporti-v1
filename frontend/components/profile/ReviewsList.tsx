"use client";

import React from "react";
import { Star, User, Quote } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

interface Review {
  id: number;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
  aspects?: Record<string, number>;
}

interface Props {
  reviews: Review[];
  totalCount: number;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((v) => (
        <Star
          key={v}
          className={`w-3.5 h-3.5 ${v <= rating ? "text-amber-400 fill-amber-400" : "text-neutral-200"}`}
        />
      ))}
    </div>
  );
}

const ASPECT_LABELS: Record<string, string> = {
  ponctualité: "Ponctualité",
  communication: "Communication",
  soin: "Soin",
  punctuality: "Ponctualité",
  care: "Soin",
};

export function ReviewsList({ reviews, totalCount }: Props) {
  const { t, locale } = useAppI18n();
  const dateLocale = locale === "ar" ? "ar-TN" : "fr-TN";

  return (
    <div className="rounded-2xl overflow-hidden border border-neutral-100 shadow-sm">
      {/* Header — deep navy */}
      <div className="px-6 py-4 bg-gradient-to-r from-brand-900 to-brand-600 flex items-center justify-between">
        <h3 className="text-base font-bold text-white tracking-wide">
          {t.profile.reviewsTitle}
        </h3>
        <span className="text-xs font-semibold text-accent-400 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
          {totalCount} {t.profile.reviews}
        </span>
      </div>

      {reviews.length > 0 ? (
        <div className="bg-white divide-y divide-neutral-100">
          {reviews.map((review, i) => (
            <div
              key={review.id}
              className="px-6 py-5 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-900 to-brand-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">
                    {review.reviewer_name
                      .split(" ")
                      .map((w) => w.charAt(0))
                      .join("")
                      .slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-semibold text-neutral-900">
                      {review.reviewer_name}
                    </p>
                    <p className="text-xs text-neutral-400 font-medium">
                      {new Date(review.created_at).toLocaleDateString(dateLocale, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <StarRating rating={review.rating} />
                  <p className="text-sm text-neutral-600 mt-2.5 leading-relaxed">
                    <Quote className="w-3 h-3 text-accent-400 inline me-1 -mt-1" />
                    {review.comment}
                  </p>

                  {/* Aspect ratings — green accent pills */}
                  {review.aspects && Object.keys(review.aspects).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {Object.entries(review.aspects).map(([key, val]) => (
                        <span
                          key={key}
                          className="text-xs bg-accent-50 text-accent-700 px-2.5 py-1 rounded-full font-medium border border-accent-200/50"
                        >
                          {ASPECT_LABELS[key] || key}: {val}/5
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-10 text-center">
          <Star className="w-8 h-8 text-neutral-200 mx-auto mb-2" />
          <p className="text-sm text-neutral-400">{t.profile.noReviews}</p>
        </div>
      )}
    </div>
  );
}
