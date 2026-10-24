"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Modal — dialogue générique accessible                                      */
/*                                                                            */
/*  Généralise le pattern de ConfirmModal (role="dialog", aria-modal,          */
/*  Escape, focus initial, retour de focus) pour tout contenu libre.          */
/*  max-h + overflow-y : le pied de modale reste atteignable même avec        */
/*  le clavier virtuel mobile ouvert.                                         */
/* -------------------------------------------------------------------------- */

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Pied de modale (boutons d'action) */
  footer?: React.ReactNode;
  /** Empêche la fermeture (Escape/backdrop/croix) pendant une action */
  closeDisabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  closeDisabled = false,
  size = "md",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus initial dans la modale + retour de focus à la fermeture
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
      return () => previousFocusRef.current?.focus();
    }
  }, [open]);

  // Escape + piège de focus simple (Tab boucle dans la modale)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closeDisabled) {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeDisabled, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-[#0E2058]/45 animate-fade-in"
        onClick={closeDisabled ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      >
        <div
          ref={panelRef}
          className={`bg-surface w-full ${SIZE_CLASSES[size]} flex flex-col max-h-[90dvh] shadow-2xl
            rounded-sheet rounded-b-none animate-sheet-up
            sm:rounded-card sm:animate-scale-in`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
            <h3
              id="modal-title"
              className="text-[17px] font-extrabold tracking-heading text-ink-900"
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              disabled={closeDisabled}
              aria-label="Fermer"
              className="grid h-9 w-9 place-items-center rounded-chip text-ink-300 transition-colors hover:bg-app hover:text-ink-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          {/* Body — scrollable */}
          <div className="px-6 pb-4 overflow-y-auto">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex gap-3 border-t border-line px-6 pb-6 pt-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Modal;
