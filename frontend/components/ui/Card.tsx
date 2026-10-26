"use client";

import React from "react";

/* -------------------------------------------------------------------------- */
/*  Card — conteneur de surface unique                                        */
/*                                                                            */
/*  Design system « Verre & Lumière » — deux surfaces, jamais mélangées :     */
/*    - `surface` (défaut) : carte BLANCHE opaque, rayon 22px, ombre douce.   */
/*      C'est la surface de la famille applicative (fond #F6F8FC).            */
/*    - `glass` : carte TRANSLUCIDE, rayon 26px, ombre profonde. Réservée à   */
/*      la famille immersive — elle ne vit que sur un dégradé bleu ou dans un */
/*      bandeau bleu. Jamais de verre sur blanc.                              */
/*                                                                            */
/*  Pas de dégradé décoratif ici : le dégradé est réservé au fond d'écran.    */
/* -------------------------------------------------------------------------- */

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  padding?: "none" | "sm" | "md" | "lg";
  /** `surface` = blanche opaque (fond clair) · `glass` = verre (fond bleu) */
  variant?: "surface" | "glass";
  /** Contour bleu 1.5px — état sélectionné d'une carte de choix */
  selected?: boolean;
  /** Ombre + relief au survol, pour une carte entièrement cliquable */
  interactive?: boolean;
  as?: "div" | "section" | "article" | "li";
}

const PADDING_CLASSES = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-5 sm:p-6",
} as const;

const VARIANT_CLASSES = {
  surface: "bg-surface rounded-card shadow-card",
  glass:
    "relative z-[1] bg-white/[0.14] border border-white/[0.28] rounded-glass shadow-glass text-white",
} as const;

export function Card({
  padding = "md",
  variant = "surface",
  selected = false,
  interactive = false,
  as: Tag = "div",
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={`${VARIANT_CLASSES[variant]} ${PADDING_CLASSES[padding]}
        ${selected ? "border-[1.5px] border-blue-700" : ""}
        ${
          interactive
            ? "cursor-pointer transition-all duration-120 ease-out hover:shadow-card-hover active:translate-y-px active:shadow-sm"
            : ""
        }
        ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Card;
