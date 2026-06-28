import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "primary" | "accent" | "warning" | "danger" | "neutral";
  compact?: boolean;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = "primary",
  compact = false,
}: StatCardProps) {
  const colorClasses = {
    primary: "bg-brand-600/10 text-brand-600",
    accent: "bg-accent-50 text-accent-600",
    warning: "bg-orange-50 text-orange-600",
    danger: "bg-red-50 text-red-600",
    neutral: "bg-neutral-100 text-neutral-600",
  };

  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-neutral-500",
  };

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  if (compact) {
    return (
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-neutral-100 dark:border-neutral-700 p-4 hover:shadow-md transition-all animate-fade-in">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate">
              {title}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {value}
              </p>
              {trend && trendValue && (
                <span className={`text-xs font-medium ${trendColors[trend]}`}>
                  {trendValue}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-neutral-100 dark:border-neutral-700 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && trendValue && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${trendColors[trend]}`}
          >
            <TrendIcon className="w-4 h-4" />
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
          {title}
        </p>
        <p className="text-2xl font-bold text-neutral-900 dark:text-white">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
