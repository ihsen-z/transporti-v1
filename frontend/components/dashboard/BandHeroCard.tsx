"use client";

import React from "react";
import { AppBandContent } from "@/components/layout/AppBandSlot";

/* -------------------------------------------------------------------------- */
/*  Carte verre chevauchant le bandeau bleu — signature de la marque          */
/*                                                                            */
/*  Charte §4 : « Le chevauchement carte-verre / bandeau est la signature :   */
/*  la carte commence dans le bleu et descend sur le fond clair. »            */
/*                                                                            */
/*  La carte est donc RENDUE DANS le bandeau (via la lucarne) et déborde du   */
/*  bas d'une trentaine de pixels. Ce débord ne contient jamais de texte : la */
/*  partie qui descend sur le fond clair est du padding, sinon le texte blanc */
/*  du verre deviendrait illisible.                                          */
/*                                                                            */
/*  C'est la SEULE carte verre autorisée dans la famille applicative, et      */
/*  seulement à cette place. Tout le reste de l'écran est en cartes blanches. */
/* -------------------------------------------------------------------------- */

export function BandHeroCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AppBandContent>
      <div className="px-5 pb-0 pt-1 sm:px-6 lg:px-8">
        <section
          className={`glass-flush -mb-9 flex flex-col gap-5 p-5 pb-14 sm:p-6 sm:pb-16 ${className}`}
        >
          {children}
        </section>
      </div>
    </AppBandContent>
  );
}

/* -------------------------------------------------------------------------- */
/*  Chiffre héro — 34px/800, interlettrage −0.03em, chiffres tabulaires       */
/* -------------------------------------------------------------------------- */

export function HeroFigure({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  /** Précision secondaire, par exemple « dont 120 TND en attente » */
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[12.5px] font-semibold text-on-blue-300">{label}</p>
      <p className="figure-hero text-white">{value}</p>
      {hint && (
        <p className="text-[12.5px] font-medium text-on-blue-300">{hint}</p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tuile statistique sur verre — charte §3                                   */
/*  chiffre 20–22px/800 blanc, label 11.5px/600 #CBD9F5, jauge 5px            */
/* -------------------------------------------------------------------------- */

export function StatTile({
  label,
  value,
  /** Remplissage de la jauge, de 0 à 100. Absent = pas de jauge. */
  gauge,
  /** `warn` peint la jauge en orange : indicateur à améliorer. */
  tone = "good",
}: {
  label: string;
  value: string | number;
  gauge?: number | null;
  tone?: "good" | "warn";
}) {
  return (
    <div className="stat-tile flex flex-col gap-1.5">
      <span className="stat-tile__value">{value}</span>
      <span className="stat-tile__label">{label}</span>
      {gauge != null && (
        <span
          className={`stat-tile__gauge mt-0.5 ${
            tone === "warn" ? "stat-tile__gauge--warn" : ""
          }`}
        >
          <span
            style={{ width: `${Math.max(0, Math.min(100, gauge))}%` }}
            className="animate-progress-fill"
          />
        </span>
      )}
    </div>
  );
}

/** Grille de tuiles : 2 colonnes en mobile, 4 à partir de `sm`. */
export function StatTileGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
  );
}
