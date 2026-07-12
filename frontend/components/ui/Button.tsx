"use client";

import React from "react";
import { Loader2 } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Button — primitive unique pour toutes les actions                          */
/*                                                                            */
/*  Décision de marque (Sprint 2) : le CTA principal est VERT (accent),       */
/*  le bleu brand est réservé à la navigation et à l'identité visuelle.       */
/* -------------------------------------------------------------------------- */

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Texte affiché pendant le chargement (défaut : children) */
  loadingLabel?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-600 hover:bg-accent-700 active:bg-accent-800 text-white shadow-sm hover:shadow focus-visible:ring-accent-500",
  secondary:
    "bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-neutral-700 focus-visible:ring-neutral-400",
  danger:
    "bg-error-50 hover:bg-error-100 active:bg-error-200 text-error-600 border border-error-200 focus-visible:ring-error-500",
  ghost:
    "text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200 focus-visible:ring-neutral-400",
  outline:
    "border border-neutral-300 text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 focus-visible:ring-neutral-400",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-6 py-3 text-base rounded-xl gap-2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      loadingLabel,
      fullWidth = false,
      disabled,
      className = "",
      children,
      type = "button",
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-semibold transition-all
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]}
          ${fullWidth ? "w-full" : ""} ${className}`}
        {...rest}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
        {loading ? (loadingLabel ?? children) : children}
      </button>
    );
  },
);

export default Button;
