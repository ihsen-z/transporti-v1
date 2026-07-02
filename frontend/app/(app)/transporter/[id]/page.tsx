"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Languages } from "lucide-react";
import { TransporterProfileCard } from "@/components/profile/TransporterProfileCard";
import { TrustBadges } from "@/components/profile/TrustBadges";
import { VehicleGallery } from "@/components/profile/VehicleGallery";
import { ReviewsList } from "@/components/profile/ReviewsList";
import { StatsGrid } from "@/components/profile/StatsGrid";
import { TranslationProvider } from "@/lib/i18n/TranslationContext";
import { useTranslation } from "@/hooks/useTranslation";

/* -------------------------------------------------------------------------- */
/*  Mock Data                                                                 */
/* -------------------------------------------------------------------------- */

const MOCK_PROFILE = {
  first_name: "Mohamed",
  last_name: "Trabelsi",
  avatar_url: "",
  joined_at: "2025-06-15T00:00:00Z",
  is_verified: true,
  trust_score: 92,
  vehicle_type: "vehicle_truck", // Key for translation (Camion Bâché)
  vehicle_capacity_kg: 3500,
  vehicle_photos: [] as string[],
  service_areas: ["Tunis", "Sousse", "Sfax", "Nabeul"],
  specializations: ["Meubles", "Électroménager", "Fragile", "Construction"],
  completion_rate: 96.5,
  total_jobs_completed: 23,
  rating: 4.6,
  review_count: 18,
  response_time_avg_minutes: 22,
  insurance_valid_until: "2026-12-31",
};

const MOCK_REVIEWS = [
  {
    id: 1,
    reviewer_name: "Ahmed B.",
    rating: 5,
    comment:
      "Excellent transporteur ! Ponctuel, soigneux avec les meubles, et très professionnel. Je recommande vivement.",
    created_at: "2026-02-01T00:00:00Z",
    aspects: { ponctualité: 5, communication: 5, soin: 5 },
  },
  {
    id: 2,
    reviewer_name: "Fatma K.",
    rating: 4,
    comment:
      "Bon service dans l'ensemble. Un léger retard mais la livraison a été faite correctement.",
    created_at: "2026-01-20T00:00:00Z",
    aspects: { ponctualité: 3, communication: 4, soin: 5 },
  },
  {
    id: 3,
    reviewer_name: "Youssef M.",
    rating: 5,
    comment:
      "Déménagement complexe géré avec brio. Équipe efficace et matériel bien protégé.",
    created_at: "2026-01-10T00:00:00Z",
  },
];

/* -------------------------------------------------------------------------- */
/*  Transporter Profile Page Content                                          */
/* -------------------------------------------------------------------------- */

function ProfileContent() {
  const router = useRouter();
  const { t, locale, setLocale, isRtl } = useTranslation();

  const profile = MOCK_PROFILE;
  const reviews = MOCK_REVIEWS;

  return (
    <div className={`p-6 lg:p-8 max-w-5xl mx-auto ${isRtl ? "text-right" : ""}`} dir={isRtl ? "rtl" : "ltr"}>
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
          {t("back")}
        </button>
        
        {/* Language Toggle Demo */}
        <button
          onClick={() => setLocale(locale === "fr" ? "ar" : "fr")}
          className="flex items-center gap-2 text-sm font-medium bg-white px-3 py-1.5 rounded-full shadow-sm border border-neutral-200 hover:bg-neutral-50 transition-colors"
        >
          <Languages className="w-4 h-4 text-brand-600" />
          {locale === "fr" ? "العربية (Derja)" : "Français"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          <TransporterProfileCard
            firstName={profile.first_name}
            lastName={profile.last_name}
            avatarUrl={profile.avatar_url}
            isVerified={profile.is_verified}
            trustScore={profile.trust_score}
            rating={profile.rating}
            reviewCount={profile.review_count}
            joinedAt={profile.joined_at}
            serviceAreas={profile.service_areas}
            specializations={profile.specializations}
          />

          <TrustBadges
            isVerified={profile.is_verified}
            trustScore={profile.trust_score}
            completionRate={profile.completion_rate}
            totalJobsCompleted={profile.total_jobs_completed}
            averageRating={profile.rating}
          />

          <ReviewsList reviews={reviews} totalCount={profile.review_count} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <StatsGrid
            completionRate={profile.completion_rate}
            totalJobsCompleted={profile.total_jobs_completed}
            responseTimeMinutes={profile.response_time_avg_minutes}
            trustScore={profile.trust_score}
          />

          <VehicleGallery
            vehicleType={t(profile.vehicle_type)}
            vehicleCapacityKg={profile.vehicle_capacity_kg}
            vehiclePhotos={profile.vehicle_photos}
            insuranceValidUntil={profile.insurance_valid_until}
          />
        </div>
      </div>
    </div>
  );
}

export default function TransporterProfilePage() {
  return (
    <TranslationProvider>
      <ProfileContent />
    </TranslationProvider>
  );
}
