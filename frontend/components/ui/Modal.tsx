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
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={closeDisabled ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          ref={panelRef}
          className={`bg-white rounded-2xl shadow-2xl w-full ${SIZE_CLASSES[size]} animate-scale-in flex flex-col max-h-[90dvh]`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
            <h3 id="modal-title" className="text-lg font-bold text-neutral-900">
              {title}
            </h3>
            <button
              onClick={onClose}
              disabled={closeDisabled}
              aria-label="Fermer"
              className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body — scrollable */}
          <div className="px-6 pb-4 overflow-y-auto">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex gap-3 px-6 pb-6 pt-2 border-t border-neutral-100">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Modal;
