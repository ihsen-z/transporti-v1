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

  const colorMap = {
    red: {
      icon: "bg-red-100 text-red-600",
      btn: "bg-red-500 hover:bg-red-600 focus-visible:ring-red-500",
    },
    brand: {
      icon: "bg-brand-600/10 text-brand-600",
      btn: "bg-brand-600 hover:bg-brand-700 focus-visible:ring-brand-600",
    },
  };
  const colors = colorMap[confirmColor];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={loading ? undefined : onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in overflow-hidden">
          {/* Close button */}
          <button
            onClick={onCancel}
            disabled={loading}
            className="absolute top-3 end-3 p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 text-center">
            {/* Icon */}
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${colors.icon}`}
            >
              <AlertTriangle className="w-7 h-7" />
            </div>

            {/* Title */}
            <h3
              id="confirm-title"
              className="text-lg font-bold text-neutral-900 mb-2"
            >
              {title}
            </h3>

            {/* Message */}
            <p
              id="confirm-desc"
              className="text-sm text-neutral-500 leading-relaxed"
            >
              {message}
            </p>

            {/* Optional detail */}
            {detail && <div className="mt-3">{detail}</div>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-6 pb-6">
            <button
              ref={cancelRef}
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${colors.btn} inline-flex items-center justify-center gap-2`}
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
