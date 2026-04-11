"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "primary" | "accent" | "cta" | "neutral";
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = "primary",
}: StatCardProps) {
  const colorClasses = {
    primary: "bg-brand-600/5 text-brand-600",
    accent: "bg-accent-50 text-accent-700",
    cta: "bg-cta-50 text-cta-700",
    neutral: "bg-neutral-100 text-neutral-700",
  };

  const trendIcons = {
    up: <TrendingUp className="w-4 h-4" />,
    down: <TrendingDown className="w-4 h-4" />,
    neutral: <Minus className="w-4 h-4" />,
  };

  const trendColors = {
    up: "text-accent-600",
    down: "text-error-600",
    neutral: "text-neutral-500",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}
        >
          {icon}
        </div>
        {trend && trendValue && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${trendColors[trend]}`}
          >
            {trendIcons[trend]}
            {trendValue}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-neutral-600 mb-1">{title}</p>
        <p className="text-3xl font-bold text-neutral-900">{value}</p>
        {subtitle && (
          <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
