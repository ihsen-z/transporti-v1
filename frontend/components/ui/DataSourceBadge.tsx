"use client";

// Data Source Badge — shows API vs Simulation mode
// Only visible in development or when FALLBACK_TO_MOCK is explicitly enabled.

import type { DataSource } from "@/lib/services/types";

interface DataSourceBadgeProps {
  source: DataSource;
}

export default function DataSourceBadge({ source }: DataSourceBadgeProps) {
  // Hide in production — only show in dev mode
  if (process.env.NODE_ENV === "production") return null;

  const isApi = source === "api";

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <div
        className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                    shadow-sm border backdrop-blur-sm transition-all
                    ${
                      isApi
                        ? "bg-green-50/90 text-green-700 border-green-200"
                        : "bg-amber-50/90 text-amber-700 border-amber-200"
                    }
                `}
      >
        <span
          className={`w-2 h-2 rounded-full ${isApi ? "bg-green-500" : "bg-amber-500"}`}
        />
        {isApi ? "Connecté" : "Mode Simulation"}
      </div>
    </div>
  );
}
