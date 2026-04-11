"use client";

import React from "react";
import { ShieldCheck, Star, CheckCircle2, Truck, Zap } from "lucide-react";

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
  const badges = [
    {
      icon: ShieldCheck,
      label: isVerified ? "Identité vérifiée" : "Non vérifié",
      active: isVerified,
      activeClass:
        "bg-gradient-to-br from-accent-50 to-accent-100/60 text-accent-700 border-accent-300/60",
      inactiveClass: "bg-neutral-50 text-neutral-400 border-neutral-200",
    },
    {
      icon: Star,
      label:
        averageRating >= 4.5
          ? "Top noté"
          : averageRating >= 4.0
            ? "Bien noté"
            : "En progression",
      active: averageRating >= 4.0,
      activeClass:
        "bg-gradient-to-br from-amber-50 to-amber-100/60 text-amber-700 border-amber-300/60",
      inactiveClass: "bg-neutral-50 text-neutral-400 border-neutral-200",
    },
    {
      icon: CheckCircle2,
      label:
        completionRate >= 95
          ? "Fiabilité excellente"
          : completionRate >= 85
            ? "Fiable"
            : "En progression",
      active: completionRate >= 85,
      activeClass:
        "bg-gradient-to-br from-brand-600/5 to-brand-600/10 text-brand-600 border-brand-600/20",
      inactiveClass: "bg-neutral-50 text-neutral-400 border-neutral-200",
    },
    {
      icon: Truck,
      label:
        totalJobsCompleted >= 50
          ? "Expert"
          : totalJobsCompleted >= 10
            ? "Expérimenté"
            : "Débutant",
      active: totalJobsCompleted >= 10,
      activeClass:
        "bg-gradient-to-br from-purple-50 to-purple-100/60 text-purple-700 border-purple-300/60",
      inactiveClass: "bg-neutral-50 text-neutral-400 border-neutral-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {badges.map((badge, i) => (
        <div
          key={badge.label}
          className={`flex items-center gap-2.5 px-4 py-3.5 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md animate-fade-in-up ${badge.active ? badge.activeClass : badge.inactiveClass}`}
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <badge.icon className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{badge.label}</span>
          {badge.active && <Zap className="w-3 h-3 ml-auto opacity-50" />}
        </div>
      ))}
    </div>
  );
}
