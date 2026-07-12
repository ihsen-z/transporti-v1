"use client";

// Loading State — Skeleton placeholders
// Sprint 7.5 — API Transition Layer

import { Skeleton } from "./Skeleton";

interface LoadingStateProps {
  /** Type of skeleton to render */
  variant?: "table" | "cards" | "page";
  /** Number of skeleton rows/cards */
  count?: number;
}

// Réutilise ui/Skeleton (shimmer) — l'app avait deux styles de chargement
// différents (shimmer vs pulse) selon le composant.
function SkeletonPulse({ className }: { className?: string }) {
  return <Skeleton width="" height="" className={className || ""} />;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-neutral-100">
      <SkeletonPulse className="h-4 w-16" />
      <SkeletonPulse className="h-4 w-32" />
      <SkeletonPulse className="h-4 w-24" />
      <SkeletonPulse className="h-4 w-20" />
      <SkeletonPulse className="h-4 w-16" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-3">
      <SkeletonPulse className="h-4 w-24" />
      <SkeletonPulse className="h-8 w-20" />
      <SkeletonPulse className="h-3 w-32" />
    </div>
  );
}

export default function LoadingState({
  variant = "table",
  count = 5,
}: LoadingStateProps) {
  if (variant === "cards") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (variant === "page") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <SkeletonPulse className="h-7 w-48" />
          <SkeletonPulse className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Default: table
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
