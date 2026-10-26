"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, PlusCircle, RotateCcw, Route } from "lucide-react";
import ReturnPromptBanner from "@/components/return-trips/ReturnPromptBanner";
import {
  getMyReturnTrips,
  daysUntilExpiry,
  isExpired,
  type ReturnTrip,
} from "@/lib/services/returnTrips";
import {
  getLatestCompletedMission,
  type Mission,
} from "@/lib/services/missions";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";

/**
 * T1.1 — La section « Mes retours » du tableau de bord transporteur.
 *
 * Le tableau de bord était orienté missions ; le pivot en fait la racine du
 * transporteur, et sa racine est l'inventaire de retours. Cette section est
 * donc placée **au-dessus** des indicateurs de missions existants.
 *
 * Extraite dans son propre composant : `dashboard/page.tsx` fait déjà 663
 * lignes (CLAUDE.md §4).
 *
 * Trois blocs, dans l'ordre de ce qui rapporte :
 * 1. L'amorce de retour à vide, conditionnelle — rattrape le transporteur qui
 *    n'a pas publié depuis l'écran de mission (T4.4). Même composant et **même
 *    clé de refus** que là-bas : refuser à un endroit masque aux deux, sinon
 *    l'amorce deviendrait une relance.
 * 2. Les kilomètres à vide valorisés — la métrique unique du produit, rendue à
 *    celui qui la produit (IA-5).
 * 3. Les retours en ligne, avec un accès direct à l'inventaire.
 */

interface Props {
  /** Km à vide valorisés, calculés serveur (`stats.km_transformed`). */
  kmValorises?: number;
  /** Taux de remplissage serveur. `null` quand aucune donnée — jamais 0 %. */
  tauxRemplissage?: number | null;
}

export default function ReturnsHubSection({
  kmValorises,
  tauxRemplissage,
}: Props) {
  const { t } = useAppI18n();
  const h = t.returnsHub;
  const [trajets, setTrajets] = useState<ReturnTrip[] | null>(null);
  const [derniereMission, setDerniereMission] = useState<Mission | null>(null);

  useEffect(() => {
    let annule = false;

    void getMyReturnTrips()
      .then((liste) => {
        if (!annule) setTrajets(liste);
      })
      // L'échec ne doit pas masquer le reste du tableau de bord : on retombe
      // sur une section sans liste plutôt que sur un écran cassé.
      .catch(() => {
        if (!annule) setTrajets([]);
      });

    void getLatestCompletedMission().then((mission) => {
      if (!annule) setDerniereMission(mission);
    });

    return () => {
      annule = true;
    };
  }, []);

  // Seuls les trajets encore visibles dans la recherche comptent comme « en
  // ligne » : un trajet expiré n'apporte plus rien au client.
  const enLigne = (trajets ?? []).filter(
    (t) => t.status === "PUBLISHED" && !isExpired(t),
  );

  return (
    <section
      aria-labelledby="hub-retours-titre"
      className="mb-8 flex flex-col gap-4"
    >
      {derniereMission && (
        <ReturnPromptBanner
          missionId={derniereMission.id}
          depuis={derniereMission.dropoff_governorate}
          vers={derniereMission.pickup_governorate}
        />
      )}

      {/* IA-5 — la promesse du produit rendue en chiffres à celui qui la
          produit. Traitement vert : c'est de la valeur, pas un état système. */}
      {kmValorises !== undefined && kmValorises > 0 && (
        <div
          data-testid="hub-km-valorises"
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-tile bg-green-50 px-5 py-4"
        >
          <Route
            className="h-5 w-5 text-green-600"
            strokeWidth={2}
            aria-hidden="true"
          />
          <p className="text-green-700">
            <span className="text-[24px] font-extrabold tracking-heading tabular-nums">
              {Math.round(kmValorises)} km
            </span>{" "}
            {h.kmValorises}
          </p>
          {tauxRemplissage != null && (
            <span className="text-[13px] font-semibold text-green-700/80">
              {interpolate(h.tauxRemplissage, { n: tauxRemplissage })}
            </span>
          )}
        </div>
      )}

      <div className="bg-surface rounded-card shadow-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2
            id="hub-retours-titre"
            className="text-[17px] font-extrabold tracking-heading text-ink-900 flex items-center gap-2"
          >
            <RotateCcw
              className="h-5 w-5 text-blue-700"
              strokeWidth={2}
              aria-hidden="true"
            />
            {h.title}
          </h2>
          <Link
            href="/retours/nouveau"
            className="cta btn-base min-h-[48px] px-5 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
          >
            <PlusCircle
              className="h-4 w-4"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            {h.publish}
          </Link>
        </div>

        {trajets === null && (
          <div className="flex flex-col gap-2" aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className="h-12 rounded-lg skeleton" />
            ))}
          </div>
        )}

        {/* État vide sans cul-de-sac (IA-3) : le bouton de publication
            ci-dessus est la sortie, on ne la répète pas ici. */}
        {trajets !== null && enLigne.length === 0 && (
          <p
            data-testid="hub-retours-vide"
            className="text-[14px] leading-[1.55] text-ink-500"
          >
            {h.empty}
          </p>
        )}

        {enLigne.length > 0 && (
          <ul data-testid="hub-retours-liste" className="flex flex-col gap-2">
            {enLigne.slice(0, 3).map((trajet) => (
              <li
                key={trajet.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-line"
              >
                <span className="flex items-center gap-2 text-[14.5px] font-bold text-ink-900">
                  <span className="route-dot route-dot--start" aria-hidden />
                  {trajet.pickup_governorate} → {trajet.dropoff_governorate}
                  <span className="route-dot route-dot--end" aria-hidden />
                </span>
                <span className="text-[13px] text-ink-500 tabular-nums">
                  {interpolate(h.expiresIn, { n: daysUntilExpiry(trajet) })}
                </span>
              </li>
            ))}
          </ul>
        )}

        {enLigne.length > 0 && (
          <Link
            href="/retours"
            className="mt-4 inline-flex items-center gap-1.5 rounded-chip text-[13px] font-bold text-blue-700 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-blue-700/30"
          >
            {enLigne.length > 1
              ? interpolate(h.manageMany, { n: enLigne.length })
              : h.manageOne}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
