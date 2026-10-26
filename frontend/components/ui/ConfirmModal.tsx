"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, X, Loader2 } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  ConfirmModal — Accessible overlay dialog for destructive actions           */
/* -------------------------------------------------------------------------- */

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  /** Optional extra context rendered below message */
  detail?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: "red" | "brand";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  detail,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  confirmColor = "red",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button on open (safe default for destructive actions)
  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, loading, onCancel]);

  if (!open) return null;

  // L'action destructrice reste rouge ; l'action de marque passe en bleu Royal.
  // L'orange n'apparait jamais ici : il est reserve au CTA unique de l'ecran.
  const colorMap = {
    red: {
      icon: "bg-error-50 text-error-600",
      btn: "bg-error-500 hover:bg-error-600 focus-visible:ring-error-500 shadow-md",
    },
    brand: {
      icon: "bg-blue-50 text-blue-700",
      btn: "bg-blue-700 hover:bg-blue-800 focus-visible:ring-blue-700 shadow-blue",
    },
  };
  const colors = colorMap[confirmColor];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-[#0E2058]/45 animate-fade-in"
        onClick={loading ? undefined : onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      >
        <div
          className="relative w-full max-w-sm overflow-hidden bg-surface shadow-2xl
          rounded-sheet rounded-b-none animate-sheet-up
          sm:rounded-card sm:animate-scale-in"
        >
          {/* Close button */}
          <button
            onClick={onCancel}
            disabled={loading}
            className="absolute top-3 end-3 grid h-9 w-9 place-items-center rounded-chip text-ink-300 transition-colors hover:bg-app hover:text-ink-500 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 text-center">
            {/* Icon */}
            <div
              className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-tile ${colors.icon}`}
            >
              <AlertTriangle className="w-7 h-7" />
            </div>

            {/* Title */}
            <h3
              id="confirm-title"
              className="mb-2 text-[17px] font-extrabold tracking-heading text-ink-900"
            >
              {title}
            </h3>

            {/* Message */}
            <p
              id="confirm-desc"
              className="text-[14px] leading-[1.55] text-ink-500"
            >
              {message}
            </p>

            {/* Optional detail */}
            {detail && <div className="mt-3">{detail}</div>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-6 pb-6 pt-1">
            <button
              ref={cancelRef}
              onClick={onCancel}
              disabled={loading}
              className="flex-1 min-h-[48px] rounded-cta border border-line-strong bg-surface px-4 text-[15px] font-bold tracking-cta text-ink-900 transition-all duration-120 hover:bg-app active:translate-y-px disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`inline-flex flex-1 min-h-[48px] items-center justify-center gap-2 rounded-cta px-4 text-[15px] font-bold tracking-cta text-white transition-all duration-120 active:translate-y-px disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${colors.btn}`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "En cours…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
