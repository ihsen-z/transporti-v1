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
    primary: "bg-blue-50 text-blue-700",
    accent: "bg-green-50 text-green-600",
    warning: "bg-orange-50 text-orange-600",
    danger: "bg-error-50 text-error-600",
    neutral: "bg-neutral-100 text-neutral-600",
  };

  const trendColors = {
    up: "text-green-600",
    down: "text-error-600",
    neutral: "text-neutral-500",
  };

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  if (compact) {
    return (
      <div className="bg-surface dark:bg-neutral-800 rounded-card shadow-card dark:border dark:border-neutral-700 p-4 hover-lift animate-fade-in">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-chip ${colorClasses[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 truncate">
              {title}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-[17px] font-extrabold tracking-heading text-ink-900 dark:text-white">
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
    <div className="bg-surface dark:bg-neutral-800 rounded-card shadow-card dark:border dark:border-neutral-700 p-6 hover-lift animate-fade-in">
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
        <p className="text-[21px] font-extrabold tracking-heading text-ink-900 dark:text-white">
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
