"use client";

import React from "react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/* -------------------------------------------------------------------------- */
/*  Unified StatusBadge — single source of truth for job & offer statuses     */
/*  Matches backend TransportJob.Status (7) + Offer.Status (5) choices        */
/*  Couleurs : config locale ; libellés : i18n (t.status.job / t.status.offer) */
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
    bg: "bg-[#EEF2F8] text-ink-500",
    label: "Brouillon",
    dot: "bg-ink-300",
  },
  PUBLISHED: {
    bg: "bg-[#ECFDF5] text-[#0F9B6C]",
    label: "Publiée",
    dot: "bg-green-500",
  },
  MATCHED: {
    bg: "bg-blue-50 text-blue-600",
    label: "Attribuée",
    dot: "bg-blue-600",
  },
  IN_PROGRESS: {
    bg: "bg-blue-50 text-blue-700",
    label: "En cours",
    dot: "bg-blue-700",
  },
  COMPLETED: {
    bg: "bg-[#ECFDF5] text-[#0F9B6C]",
    label: "Terminée",
    dot: "bg-green-500",
  },
  CANCELLED: {
    bg: "bg-error-50 text-error-700",
    label: "Annulée",
    dot: "bg-error-500",
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
    bg: "bg-warning-50 text-warning-700",
    label: "En attente",
    dot: "bg-warning-500",
  },
  ACCEPTED: {
    bg: "bg-[#ECFDF5] text-[#0F9B6C]",
    label: "Acceptée",
    dot: "bg-green-500",
  },
  REJECTED: {
    bg: "bg-error-50 text-error-700",
    label: "Refusée",
    dot: "bg-error-500",
  },
  WITHDRAWN: {
    bg: "bg-[#EEF2F8] text-ink-500",
    label: "Retirée",
    dot: "bg-ink-300",
  },
  EXPIRED: {
    bg: "bg-[#EEF2F8] text-ink-300",
    label: "Expirée",
    dot: "bg-ink-300",
  },
};

// Merged config — job statuses take priority
const ALL_STATUS_CONFIG = { ...OFFER_STATUS_CONFIG, ...JOB_STATUS_CONFIG };

const FALLBACK = {
  bg: "bg-[#EEF2F8] text-ink-500",
  label: "",
  dot: "bg-ink-300",
};

export default function StatusBadge({
  status,
  size = "sm",
  className = "",
}: StatusBadgeProps) {
  const { t } = useAppI18n();
  const config = ALL_STATUS_CONFIG[status] || { ...FALLBACK, label: status };

  // Libellé localisé (fr/ar) ; le label FR de la config reste le fallback.
  const statusLabels = t.status as
    | { job: Record<string, string>; offer: Record<string, string> }
    | undefined;
  const label =
    statusLabels?.job?.[status] ??
    statusLabels?.offer?.[status] ??
    config.label;

  // Tag de la charte : hauteur ~28px, padding 6px 10px, 11.5px/600.
  const sizeClasses =
    size === "md"
      ? "min-h-[28px] px-2.5 py-1.5 text-[13px]"
      : "min-h-[24px] px-2.5 py-1 text-[11.5px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-tag font-semibold leading-none ${sizeClasses} ${config.bg} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`}
      />
      {label}
    </span>
  );
}

// Re-export the configs for external use (e.g., charts, legends)
export { JOB_STATUS_CONFIG, OFFER_STATUS_CONFIG };
