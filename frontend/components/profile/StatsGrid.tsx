"use client";

import React from "react";
import { TrendingUp, CheckCircle2, Clock, Truck } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  completionRate: number;
  totalJobsCompleted: number;
  responseTimeMinutes?: number;
  trustScore: number;
}

export function StatsGrid({
  completionRate,
  totalJobsCompleted,
  responseTimeMinutes,
  trustScore,
}: Props) {
  const { t } = useTranslation();
  const stats = [
    {
      icon: TrendingUp,
      label: t("trust_score"),
      value: `${trustScore}/100`,
      iconBg:
        trustScore >= 80
          ? "bg-accent-500/10 text-accent-600"
          : trustScore >= 50
            ? "bg-amber-500/10 text-amber-600"
            : "bg-red-500/10 text-red-600",
    },
    {
      icon: CheckCircle2,
      label: t("completion_rate"),
      value: `${completionRate.toFixed(1)}%`,
      iconBg:
        completionRate >= 90
          ? "bg-accent-500/10 text-accent-600"
          : "bg-amber-500/10 text-amber-600",
    },
    {
      icon: Truck,
      label: t("total_jobs"),
      value: totalJobsCompleted.toString(),
      iconBg: "bg-brand-600/10 text-brand-600",
    },
    {
      icon: Clock,
      label: t("avg_response_time"),
      value: responseTimeMinutes ? `${responseTimeMinutes} ${t("min")}` : "N/A",
      iconBg:
        responseTimeMinutes && responseTimeMinutes < 30
          ? "bg-accent-500/10 text-accent-600"
          : "bg-neutral-100 text-neutral-500",
    },
  ];

  return (
    <div className="rounded-2xl overflow-hidden border border-neutral-100 shadow-sm">
      {/* Header — deep navy */}
      <div className="px-6 py-4 bg-gradient-to-r from-brand-900 to-brand-600">
        <h3 className="text-base font-bold text-white tracking-wide">
          Statistiques
        </h3>
      </div>
      <div className="bg-white grid grid-cols-2 divide-x divide-y divide-neutral-100">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="p-5 text-center animate-fade-in-up"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-2.5 ${stat.iconBg}`}
            >
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-xl font-bold text-neutral-900">{stat.value}</p>
            <p className="text-xs text-neutral-400 mt-1 font-medium">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
