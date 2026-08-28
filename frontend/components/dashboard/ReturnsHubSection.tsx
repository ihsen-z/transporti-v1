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
    <section aria-labelledby="hub-retours-titre" className="mb-8 space-y-4">
      {derniereMission && (
        <ReturnPromptBanner
          missionId={derniereMission.id}
          depuis={
            derniereMission.dropoff_governorate ||
            derniereMission.dropoff_address
          }
          vers={
            derniereMission.pickup_governorate || derniereMission.pickup_address
          }
        />
      )}

      {/* IA-5 — la promesse du produit rendue en chiffres à celui qui la
          produit. Traitement vert : c'est de la valeur, pas un état système. */}
      {kmValorises !== undefined && kmValorises > 0 && (
        <div
          data-testid="hub-km-valorises"
          className="rounded-xl border border-accent-600/30 bg-accent-50 px-5 py-4 flex flex-wrap items-baseline gap-x-3 gap-y-1"
        >
          <Route className="w-5 h-5 text-accent-700" aria-hidden="true" />
          <p className="text-accent-700">
            <span className="text-2xl font-bold tabular-nums">
              {Math.round(kmValorises)} km
            </span>{" "}
            de retour à vide valorisés
          </p>
          {tauxRemplissage != null && (
            <span className="text-sm text-accent-700/80">
              · {tauxRemplissage} % de vos retours trouvent un client
            </span>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-100 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2
            id="hub-retours-titre"
            className="text-lg font-semibold text-neutral-900 flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5 text-brand-600" aria-hidden="true" />
            Mes retours en ligne
          </h2>
          <Link
            href="/retours/nouveau"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cta-500 text-white text-sm font-semibold hover:bg-cta-600 focus-visible:ring-2 focus-visible:ring-cta-500/40 outline-none"
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            Publier un retour
          </Link>
        </div>

        {trajets === null && (
          <div className="space-y-2" aria-busy="true">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-12 rounded-lg bg-neutral-100 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* État vide sans cul-de-sac (IA-3) : le bouton de publication
            ci-dessus est la sortie, on ne la répète pas ici. */}
        {trajets !== null && enLigne.length === 0 && (
          <p
            data-testid="hub-retours-vide"
            className="text-sm text-neutral-500"
          >
            Aucun retour en ligne. Publiez le trajet que vous faites déjà : les
            clients du corridor le verront.
          </p>
        )}

        {enLigne.length > 0 && (
          <ul data-testid="hub-retours-liste" className="space-y-2">
            {enLigne.slice(0, 3).map((trajet) => (
              <li
                key={trajet.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-neutral-100"
              >
                <span className="font-semibold text-neutral-900">
                  {trajet.pickup_governorate} → {trajet.dropoff_governorate}
                </span>
                <span className="text-sm text-neutral-500 tabular-nums">
                  expire dans {daysUntilExpiry(trajet)} j
                </span>
              </li>
            ))}
          </ul>
        )}

        {enLigne.length > 0 && (
          <Link
            href="/retours"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600/30 outline-none rounded"
          >
            Gérer mes {enLigne.length} retour
            {enLigne.length > 1 ? "s" : ""}
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
