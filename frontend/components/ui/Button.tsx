"use client";

import React from "react";
import { Loader2 } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Button — primitive unique pour toutes les actions                         */
/*                                                                            */
/*  Design system « Verre & Lumière » :                                       */
/*    - `cta`       ORANGE. UN SEUL par écran. C'est l'action que l'on veut   */
/*                  voir cliquée (réserver, publier, valider le paiement).    */
/*    - `primary`   BLEU plein. L'action normale d'un formulaire ou d'une     */
/*                  carte. C'est le défaut : la plupart des boutons de        */
/*                  l'application doivent être bleus, pas orange.             */
/*    - `outline`   Fond blanc + filet. Action secondaire sur fond clair.     */
/*    - `ghost`     Sans fond. Action tertiaire sur fond clair.               */
/*    - `on-blue`   Verre. Action posée sur un dégradé/bandeau bleu.          */
/*    - `danger`    Rouge en teinte claire. Action destructrice.              */
/*                                                                            */
/*  Rappel de la règle : si un écran affiche déjà un bouton `cta`, tout le    */
/*  reste passe en `primary`, `outline` ou `ghost`.                           */
/* -------------------------------------------------------------------------- */

type ButtonVariant =
  | "cta"
  | "primary"
  | "secondary"
  | "danger"
  | "ghost"
  | "outline"
  | "on-blue";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Texte affiché pendant le chargement (défaut : children) */
  loadingLabel?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  /* CTA unique — orange, ombre orange marquée */
  cta: "bg-orange-500 text-white shadow-cta hover:bg-orange-600 active:translate-y-px active:shadow-cta-active focus-visible:ring-orange-500",

  /* Action normale — bleu Royal, ombre bleue */
  primary:
    "bg-blue-700 text-white shadow-blue hover:bg-blue-800 active:translate-y-px active:shadow-md focus-visible:ring-blue-700",

  /* Action secondaire neutre sur fond clair */
  secondary:
    "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:translate-y-px focus-visible:ring-neutral-400",

  /* Destructive — rouge en teinte claire, jamais en aplat plein */
  danger:
    "bg-error-50 text-error-600 border border-error-200 hover:bg-error-100 active:translate-y-px focus-visible:ring-error-500",

  /* Tertiaire sans fond */
  ghost:
    "text-blue-700 hover:bg-blue-50 active:translate-y-px focus-visible:ring-blue-700",

  /* Contour sur fond clair */
  outline:
    "bg-white text-ink-900 border border-line-strong hover:bg-app hover:border-blue-700 active:translate-y-px focus-visible:ring-blue-700",

  /* Verre — uniquement sur dégradé ou bandeau bleu */
  "on-blue":
    "bg-white/[0.16] text-white border border-white/30 hover:bg-white/[0.24] active:translate-y-px focus-visible:ring-white/70",
};

/* Hauteurs de la charte : 56px pour une action pleine largeur, 44px minimum
   partout ailleurs (cible tactile). */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-[36px] px-3.5 text-[13px] rounded-chip gap-1.5",
  md: "min-h-[44px] px-4 text-[14.5px] rounded-cta gap-2",
  lg: "min-h-[56px] px-6 text-[16.5px] rounded-cta gap-2",
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
        className={`inline-flex items-center justify-center whitespace-nowrap font-bold tracking-cta
          transition-all duration-120 ease-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
          disabled:hover:translate-y-0
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
