"use client";

import React from "react";
import { ShieldCheck, Star, CheckCircle2, Truck, Zap } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
interface Props {
  isVerified: boolean;
  trustScore: number;
  completionRate: number;
  totalJobsCompleted: number;
  averageRating: number;
}

export function TrustBadges({
  isVerified,
  trustScore,
  completionRate,
  totalJobsCompleted,
  averageRating,
}: Props) {
  const { t, locale } = useAppI18n();
  const badges = [
    {
      icon: ShieldCheck,
      label: isVerified
        ? t.profile.verifiedIdentity
        : locale === "ar"
          ? "غير موثق"
          : "Non vérifié",
      active: isVerified,
      activeClass: "bg-green-50/60 text-accent-700 border-accent-300/60",
      inactiveClass: "bg-neutral-50 text-neutral-400 border-neutral-200",
    },
    {
      icon: Star,
      label:
        averageRating >= 4.5
          ? locale === "ar"
            ? "نوت طيّارة"
            : "Top noté"
          : averageRating >= 4.0
            ? locale === "ar"
              ? "باهي"
              : "Bien noté"
            : locale === "ar"
              ? "في تحسّن"
              : "En progression",
      active: averageRating >= 4.0,
      activeClass: "bg-warning-50/60 text-warning-700 border-amber-300/60",
      inactiveClass: "bg-neutral-50 text-neutral-400 border-neutral-200",
    },
    {
      icon: ShieldCheck,
      label: t.profile.businessLicense,
      active: isVerified, // Demo logic: linking it to isVerified
      activeClass: "bg-green-50/60 text-green-700 border-green-300/60",
      inactiveClass: "bg-neutral-50 text-neutral-400 border-neutral-200",
    },
    {
      icon: ShieldCheck,
      label: t.profile.cargoInsurance,
      active: true, // Demo logic: assuming they have it
      activeClass: "bg-blue-50/60 text-blue-700 border-blue-300/60",
      inactiveClass: "bg-neutral-50 text-neutral-400 border-neutral-200",
    },
    {
      icon: CheckCircle2,
      label:
        completionRate >= 95
          ? locale === "ar"
            ? "ثقة تامة"
            : "Fiabilité excellente"
          : completionRate >= 85
            ? locale === "ar"
              ? "ثقة"
              : "Fiable"
            : locale === "ar"
              ? "في تحسّن"
              : "En progression",
      active: completionRate >= 85,
      activeClass: "bg-blue-50 text-brand-600 border-brand-600/20",
      inactiveClass: "bg-neutral-50 text-neutral-400 border-neutral-200",
    },
    {
      icon: Truck,
      label:
        totalJobsCompleted >= 50
          ? locale === "ar"
            ? "معلّم"
            : "Expert"
          : totalJobsCompleted >= 10
            ? locale === "ar"
              ? "مجرّب"
              : "Expérimenté"
            : locale === "ar"
              ? "جديد"
              : "Débutant",
      active: totalJobsCompleted >= 10,
      activeClass: "bg-blue-50/60 text-blue-700 border-blue-300/60",
      inactiveClass: "bg-neutral-50 text-neutral-400 border-neutral-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {badges.map((badge, i) => (
        <div
          key={badge.label}
          className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl border transition-all hover:shadow-md animate-fade-in-up ${badge.active ? badge.activeClass : badge.inactiveClass}`}
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <badge.icon className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{badge.label}</span>
          {badge.active && <Zap className="w-3 h-3 ms-auto opacity-50" />}
        </div>
      ))}
    </div>
  );
}
