"use client";

import React from "react";
import Image from "next/image";
import {
  User,
  ShieldCheck,
  Star,
  MapPin,
  Calendar,
  BadgeCheck,
} from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { getMediaUrl } from "@/lib/imageUtils";

interface Props {
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isVerified: boolean;
  trustScore: number;
  rating: number;
  reviewCount: number;
  joinedAt: string;
  serviceAreas: string[];
  specializations: string[];
}

export function TransporterProfileCard({
  firstName,
  lastName,
  avatarUrl,
  isVerified,
  trustScore,
  rating,
  reviewCount,
  joinedAt,
  serviceAreas,
  specializations,
}: Props) {
  const { t, locale } = useAppI18n();
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl">
      {/* Hero Banner — deep navy gradient matching brand charter */}
      <div className="h-36 bg-gradient-to-br from-brand-900 via-brand-600 to-brand-800 relative">
        {/* Subtle dot pattern overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Decorative gradient orbs */}
        <div className="absolute bottom-0 right-12 w-40 h-40 bg-accent-500/15 rounded-full blur-3xl" />
        <div className="absolute top-0 left-20 w-32 h-32 bg-cyan-400/10 rounded-full blur-3xl" />

        {/* Verified badge overlay */}
        {isVerified && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-accent-500/90 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg shadow-accent-500/25">
            <BadgeCheck className="w-3.5 h-3.5" />
            {t.profile.verified}
          </div>
        )}
      </div>

      {/* Avatar + Info */}
      <div className="bg-white px-6 pb-6 -mt-14 relative">
        <div className="flex items-end gap-4 mb-5">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-xl flex items-center justify-center overflow-hidden ring-2 ring-accent-200/50">
            {avatarUrl ? (
              <Image
                src={getMediaUrl(avatarUrl)}
                alt={`${firstName} ${lastName}`}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-brand-900 to-brand-600 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {firstName.charAt(0)}
                  {lastName.charAt(0)}
                </span>
              </div>
            )}
          </div>
          <div className="pb-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900">
                {firstName} {lastName}
              </h1>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-sm font-bold text-neutral-900">
                  {rating.toFixed(1)}
                </span>
                <span className="text-sm text-neutral-400">
                  ({reviewCount} {t.profile.reviews})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Score — animated progress bar */}
        <div className="mb-5 bg-neutral-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              {t.profile.trustScore}
            </span>
            <span className="text-sm font-bold text-neutral-900">
              {trustScore}/100
            </span>
          </div>
          <div className="w-full bg-neutral-200/60 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-2.5 rounded-full animate-progress-fill"
              style={{
                width: `${trustScore}%`,
                background:
                  trustScore >= 80
                    ? "linear-gradient(90deg, #22C55E, #16A34A)"
                    : trustScore >= 50
                      ? "linear-gradient(90deg, #F59E0B, #D97706)"
                      : "linear-gradient(90deg, #EF4444, #DC2626)",
              }}
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-neutral-500 mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-neutral-400" />
            {t.profile.memberSince}{" "}
            {new Date(joinedAt).toLocaleDateString(locale === 'ar' ? 'ar-TN' : 'fr-TN', {
              month: "long",
              year: "numeric",
            })}
          </div>
          {serviceAreas.length > 0 && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-accent-500" />
              <span className="text-accent-700 font-medium">
                {serviceAreas.slice(0, 3).join(", ")}
                {serviceAreas.length > 3 && ` +${serviceAreas.length - 3}`}
              </span>
            </div>
          )}
        </div>

        {/* Specializations — green pill badges */}
        {specializations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {specializations.map((spec) => (
              <span
                key={spec}
                className="text-xs bg-accent-50 text-accent-700 px-3 py-1.5 rounded-full font-semibold border border-accent-200/60"
              >
                {spec}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
