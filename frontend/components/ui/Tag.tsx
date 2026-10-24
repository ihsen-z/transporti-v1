import React from "react";

/* -------------------------------------------------------------------------- */
/*  Tag — charte §3                                                           */
/*                                                                            */
/*  Hauteur ~28px, padding 6px 10px, rayon 8px, 11.5px/600.                   */
/*    BLEU  (#EEF2FF / #2563B3) — la NATURE du trajet                        */
/*    GRIS  (#EEF2F8 / #6B7280) — un FAIT (poids, volume, date)              */
/*    VERT  (#ECFDF5 / #0F9B6C) — la VALEUR (économie, vérifié)              */
/*  L'orange et le rouge sont des exceptions d'alerte, pas des catégories.    */
/*  Sur fond bleu, tous les tags passent en verre.                            */
/* -------------------------------------------------------------------------- */

export type TagTone = "blue" | "gray" | "green" | "orange" | "red" | "on-blue";

export interface TagProps {
  tone?: TagTone;
  /** Icône 12–14px placée avant le libellé */
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const TONE_CLASS: Record<TagTone, string> = {
  blue: "tag--blue",
  gray: "tag--gray",
  green: "tag--green",
  orange: "tag--orange",
  red: "tag--red",
  "on-blue": "tag--on-blue",
};

export function Tag({
  tone = "gray",
  icon,
  children,
  className = "",
}: TagProps) {
  return (
    <span className={`tag ${TONE_CLASS[tone]} ${className}`}>
      {icon}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pastille de remise — pill verte, vrai signe moins U+2212 (charte §6)      */
/* -------------------------------------------------------------------------- */

export function DiscountBadge({
  /** Pourcentage entier, positif : 38 rend « −38 % » */
  percent,
  className = "",
}: {
  percent: number;
  className?: string;
}) {
  return (
    <span className={`badge-discount ${className}`}>
      {"−"}
      {Math.round(percent)} %
    </span>
  );
}

export default Tag;
