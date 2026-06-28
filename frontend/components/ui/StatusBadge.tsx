"use client";

import React from "react";

/* -------------------------------------------------------------------------- */
/*  Unified StatusBadge — single source of truth for job & offer statuses     */
/*  Matches backend TransportJob.Status (7) + Offer.Status (5) choices        */
/* -------------------------------------------------------------------------- */

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  className?: string;
}

// Job statuses (from logistics/models.py TransportJob.Status)
const JOB_STATUS_CONFIG: Record<
  string,
  { bg: string; label: string; dot: string }
> = {
  DRAFT: {
    bg: "bg-neutral-100 text-neutral-700",
    label: "Brouillon",
    dot: "bg-neutral-400",
  },
  PUBLISHED: {
    bg: "bg-accent-50 text-accent-700",
    label: "Publiée",
    dot: "bg-accent-500",
  },
  MATCHED: {
    bg: "bg-purple-50 text-purple-700",
    label: "Attribuée",
    dot: "bg-purple-500",
  },
  IN_PROGRESS: {
    bg: "bg-brand-600/10 text-brand-600",
    label: "En cours",
    dot: "bg-brand-600",
  },
  COMPLETED: {
    bg: "bg-emerald-50 text-emerald-700",
    label: "Terminée",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    bg: "bg-red-50 text-red-700",
    label: "Annulée",
    dot: "bg-red-500",
  },
  DISPUTED: {
    bg: "bg-orange-50 text-orange-700",
    label: "Litige",
    dot: "bg-orange-500",
  },
};

// Offer statuses (from logistics/models.py Offer.Status)
const OFFER_STATUS_CONFIG: Record<
  string,
  { bg: string; label: string; dot: string }
> = {
  PENDING: {
    bg: "bg-amber-50 text-amber-700",
    label: "En attente",
    dot: "bg-amber-500",
  },
  ACCEPTED: {
    bg: "bg-accent-50 text-accent-700",
    label: "Acceptée",
    dot: "bg-accent-500",
  },
  REJECTED: {
    bg: "bg-red-50 text-red-700",
    label: "Refusée",
    dot: "bg-red-500",
  },
  WITHDRAWN: {
    bg: "bg-neutral-100 text-neutral-600",
    label: "Retirée",
    dot: "bg-neutral-400",
  },
  EXPIRED: {
    bg: "bg-neutral-100 text-neutral-500",
    label: "Expirée",
    dot: "bg-neutral-400",
  },
};

// Merged config — job statuses take priority
const ALL_STATUS_CONFIG = { ...OFFER_STATUS_CONFIG, ...JOB_STATUS_CONFIG };

const FALLBACK = {
  bg: "bg-neutral-100 text-neutral-600",
  label: "",
  dot: "bg-neutral-400",
};

export default function StatusBadge({
  status,
  size = "sm",
  className = "",
}: StatusBadgeProps) {
  const config = ALL_STATUS_CONFIG[status] || { ...FALLBACK, label: status };

  const sizeClasses =
    size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizeClasses} ${config.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

// Re-export the configs for external use (e.g., charts, legends)
export { JOB_STATUS_CONFIG, OFFER_STATUS_CONFIG };
