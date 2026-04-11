"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { TransporterProfileCard } from "@/components/profile/TransporterProfileCard";
import { ReviewDisplay } from "@/components/reviews/ReviewDisplay";
import { Star, MessageSquare, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface TransporterData {
  first_name: string;
  last_name: string;
  is_verified: boolean;
  trust_score: number;
  rating: number;
  review_count: number;
  joined_at: string;
  service_areas: string[];
  specializations: string[];
  vehicle_type?: string;
  vehicle_capacity_kg?: number;
  completion_rate?: number;
  total_jobs_completed?: number;
}

interface ReviewData {
  id: number;
  rating: number | null;
  comment: string;
  aspects: Record<string, number>;
  reviewer_name: string;
  reviewer_avatar: string | null;
  is_revealed: boolean;
  created_at: string;
}

/* -------------------------------------------------------------------------- */
/*  Public Profile Page                                                       */
/* -------------------------------------------------------------------------- */

export default function TransporterProfilePage() {
  const params = useParams();
  const userId = params?.userId ? String(params.userId) : null;

  const [transporter, setTransporter] = useState<TransporterData | null>(null);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<
    "all" | "positive" | "negative"
  >("all");

  useEffect(() => {
    if (userId) fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, reviewsData] = await Promise.all([
        apiClient.get<TransporterData>(`/api/transporter/profile/${userId}/`),
        apiClient.get<any>(`/api/reviews/user/${userId}/`),
      ]);
      setTransporter(profileData);
      // Handle paginated or flat response
      const reviewsList =
        reviewsData.results ?? (Array.isArray(reviewsData) ? reviewsData : []);
      setReviews(reviewsList);
    } catch (e: any) {
      console.error("Error fetching profile:", e);
      setError(e?.message || "Profil introuvable.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-neutral-500">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (error || !transporter) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "Profil introuvable."}</p>
          <Link
            href="/jobs/browse"
            className="text-brand-600 hover:underline text-sm font-medium"
          >
            ← Retour aux missions
          </Link>
        </div>
      </div>
    );
  }

  // Only show revealed reviews with actual ratings
  const visibleReviews = reviews.filter(
    (r) => r.is_revealed && r.rating !== null,
  );

  const filteredReviews = visibleReviews.filter((r) => {
    if (reviewFilter === "positive") return (r.rating || 0) >= 4;
    if (reviewFilter === "negative") return (r.rating || 0) < 4;
    return true;
  });

  // Calculate aggregate aspects from visible reviews
  const avgAspects = (() => {
    const allAspects = visibleReviews.filter(
      (r) => r.aspects && Object.keys(r.aspects).length > 0,
    );
    if (allAspects.length === 0) return null;

    const sums: Record<string, { total: number; count: number }> = {};
    allAspects.forEach((r) => {
      Object.entries(r.aspects).forEach(([key, val]) => {
        if (val && val > 0) {
          if (!sums[key]) sums[key] = { total: 0, count: 0 };
          sums[key].total += val;
          sums[key].count += 1;
        }
      });
    });

    return Object.fromEntries(
      Object.entries(sums).map(([key, { total, count }]) => [
        key,
        total / count,
      ]),
    );
  })();

  const ASPECT_LABELS: Record<string, string> = {
    punctuality: "Ponctualité",
    care: "Soin",
    communication: "Communication",
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Back button */}
      <Link
        href="/jobs/browse"
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux missions
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile Card */}
        <div className="lg:col-span-1">
          <TransporterProfileCard
            firstName={transporter.first_name}
            lastName={transporter.last_name}
            isVerified={transporter.is_verified}
            trustScore={transporter.trust_score}
            rating={transporter.rating}
            reviewCount={transporter.review_count}
            joinedAt={transporter.joined_at}
            serviceAreas={transporter.service_areas || []}
            specializations={transporter.specializations || []}
          />
        </div>

        {/* Right: Reviews */}
        <div className="lg:col-span-2 space-y-6">
          {/* Aspect Summary — only if we have data */}
          {avgAspects && Object.keys(avgAspects).length > 0 && (
            <div className="bg-white rounded-xl border border-neutral-100 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900 mb-4">
                Performance moyenne
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(avgAspects).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <p className="text-2xl font-bold text-neutral-900">
                      {value.toFixed(1)}
                    </p>
                    <div className="flex justify-center my-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= Math.round(value)
                              ? "text-amber-400 fill-amber-400"
                              : "text-neutral-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-neutral-500">
                      {ASPECT_LABELS[key] || key}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review Filters */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-neutral-900">
              Avis ({visibleReviews.length})
            </h3>
            <div className="flex gap-1 bg-brand-600/5 rounded-xl p-1">
              {[
                { id: "all" as const, label: "Tous" },
                { id: "positive" as const, label: "4-5 ★" },
                { id: "negative" as const, label: "1-3 ★" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setReviewFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    reviewFilter === tab.id
                      ? "bg-white text-brand-600 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Review List */}
          <div className="space-y-3">
            {filteredReviews.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-neutral-100 shadow-sm">
                <MessageSquare className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">
                  {visibleReviews.length === 0
                    ? "Aucun avis pour le moment."
                    : "Aucun avis dans cette catégorie."}
                </p>
              </div>
            ) : (
              filteredReviews.map((review) => (
                <ReviewDisplay
                  key={review.id}
                  review={{
                    id: review.id,
                    reviewer_name: review.reviewer_name,
                    reviewer_role: "CLIENT",
                    rating: review.rating || 0,
                    comment: review.comment,
                    aspects: review.aspects,
                    created_at: review.created_at,
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
