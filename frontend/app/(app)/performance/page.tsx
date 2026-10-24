"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Heart,
  Loader2,
  MapPin,
  PlusCircle,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { useAuth } from "@/hooks/useAuth";
import { getTransporterProfile } from "@/lib/services/profiles";
import { interpolate } from "@/lib/i18n/interpolate";
import { formatTND } from "@/lib/format";
import {
  getLoyalClients,
  getTransporterStats,
  type CorridorSousDesservi,
  type Fidelite,
  type RevenuParCorridor,
} from "@/lib/services/stats";

/**
 * T5.4 — Performance par corridor.
 *
 * B-3b a été livré au lot 1 : `revenue_by_corridor` et `underserved_corridors`
 * sont calculés par `stats.py` et exposés depuis, mais n'étaient consommés
 * NULLE PART — ni web, ni mobile. Cet écran est leur première interface.
 *
 * Deux moitiés, et c'est le point : la première est rétrospective (ce que les
 * corridors ont rapporté), la seconde prospective (où la demande attend). Un
 * bilan seul n'appelle aucune action.
 *
 * Aucun chiffre n'est calculé ici. Contrat `stats.py` : toute figure montrée à
 * un transporteur vient de `get_transporter_stats()`.
 */
export default function PerformancePage() {
  const { t } = useAppI18n();
  const { user } = useAuth();
  // T0.1 — quand il n'y a AUCUNE opportunite, la cause la plus frequente est
  // qu'aucune zone n'est declaree : `underserved_corridors` rend alors []
  // par construction. Un ecran vide sans explication laisse croire que le
  // marche est calme, alors que c'est le profil qui est incomplet.
  const [zonesDeclarees, setZonesDeclarees] = useState<boolean | null>(null);
  const [revenus, setRevenus] = useState<RevenuParCorridor[]>([]);
  const [opportunites, setOpportunites] = useState<CorridorSousDesservi[]>([]);
  // T5.5 — les clients fideles. `null` = indisponible : la section est alors
  // tue plutot que rendue vide, ce qui ferait croire a un portefeuille desert.
  const [fidelite, setFidelite] = useState<Fidelite | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(false);
    const stats = await getTransporterStats();
    if (!stats) {
      // `null` = indisponible, jamais « zéro corridor » : afficher un tableau
      // vide ferait croire à un transporteur qu'il n'a rien gagné.
      setErreur(true);
      setChargement(false);
      return;
    }
    setRevenus(stats.revenue_by_corridor ?? []);
    setOpportunites(stats.underserved_corridors ?? []);
    setFidelite(await getLoyalClients());

    // Lecture CIBLEE : seulement quand la section prospective est vide, pour
    // savoir s'il faut expliquer pourquoi.
    if ((stats.underserved_corridors ?? []).length === 0 && user?.id) {
      try {
        const profil = await getTransporterProfile<{
          service_areas?: string[];
        }>(user.id);
        setZonesDeclarees((profil.service_areas?.length ?? 0) > 0);
      } catch {
        // Ne pas savoir n'autorise pas a accuser le profil : on retombe sur
        // le message generique.
        setZonesDeclarees(null);
      }
    }
    setChargement(false);
  }, [user?.id]);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (chargement) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p data-testid="performance-erreur" className="text-neutral-500">
          {t.performance.loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
      <header>
        {/* Titre retire : le bandeau bleu l annonce deja (charte §4).
            Seul le sous-titre reste, il porte une information neuve. */}
        <p className="text-[14.5px] leading-[1.55] text-ink-500">
          {t.performance.subtitle}
        </p>
      </header>

      <section className="bg-surface rounded-card shadow-card p-5">
        <h2 className="text-[17px] font-extrabold tracking-heading text-ink-900 mb-1">
          {t.performance.revenueTitle}
        </h2>
        <p className="text-sm text-neutral-500 mb-4">
          {t.performance.revenueHint}
        </p>

        {revenus.length > 0 ? (
          // `overflow-x-auto` : cinq colonnes ne tiennent pas sur un téléphone,
          // et tronquer le revenu serait le pire endroit où couper.
          <div className="overflow-x-auto">
            <table
              data-testid="performance-corridors"
              className="w-full text-sm"
            >
              <thead>
                <tr className="text-neutral-500 border-b border-neutral-200">
                  <th className="py-2 pe-4 font-medium text-start">
                    {t.performance.colCorridor}
                  </th>
                  <th className="py-2 pe-4 font-medium text-start">
                    {t.performance.colMissions}
                  </th>
                  <th className="py-2 pe-4 font-medium text-start">
                    {t.performance.colReturns}
                  </th>
                  <th className="py-2 pe-4 font-medium text-start">
                    {t.performance.colKm}
                  </th>
                  <th className="py-2 font-medium text-start">
                    {t.performance.colRevenue}
                  </th>
                </tr>
              </thead>
              <tbody>
                {revenus.map((ligne) => (
                  <tr
                    key={`${ligne.pickup_governorate}-${ligne.dropoff_governorate}`}
                    data-testid="performance-corridor-ligne"
                    className="border-b border-line last:border-0"
                  >
                    <td className="py-3 pe-4 font-medium text-neutral-900">
                      {ligne.pickup_governorate} &rarr;{" "}
                      {ligne.dropoff_governorate}
                    </td>
                    <td className="py-3 pe-4 tabular-nums">{ligne.missions}</td>
                    <td className="py-3 pe-4 tabular-nums">
                      {ligne.return_trip_missions}
                    </td>
                    <td className="py-3 pe-4 tabular-nums">
                      {Math.round(ligne.km)}
                    </td>
                    <td className="py-3 font-semibold tabular-nums text-neutral-900">
                      {formatTND(ligne.revenue_net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p
            data-testid="performance-corridors-vide"
            className="text-neutral-500"
          >
            {t.performance.revenueEmpty}
          </p>
        )}
      </section>

      <section className="bg-surface rounded-card shadow-card p-5">
        <h2 className="text-[17px] font-extrabold tracking-heading text-ink-900 mb-1 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-600" aria-hidden="true" />
          {t.performance.underservedTitle}
        </h2>
        <p className="text-sm text-neutral-500 mb-4">
          {t.performance.underservedHint}
        </p>

        {opportunites.length > 0 ? (
          <ul
            data-testid="performance-opportunites"
            className="flex flex-col gap-3"
          >
            {opportunites.map((corridor) => (
              <li
                key={`${corridor.pickup_governorate}-${corridor.dropoff_governorate}`}
                data-testid="performance-opportunite"
                className="flex flex-wrap items-center justify-between gap-3 border border-neutral-200 rounded-lg p-3"
              >
                <div>
                  <p className="font-medium text-neutral-900 flex items-center gap-2">
                    <MapPin
                      className="w-4 h-4 text-neutral-400"
                      aria-hidden="true"
                    />
                    {corridor.pickup_governorate} &rarr;{" "}
                    {corridor.dropoff_governorate}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {interpolate(t.performance.underservedCount, {
                      count: corridor.pending_demands,
                    })}
                  </p>
                </div>
                {/* Le corridor est pré-rempli : l'opportunité ne vaut que si
                    publier depuis elle coûte un clic. */}
                <Link
                  data-testid="performance-opportunite-publier"
                  href={`/retours/nouveau?pickup_governorate=${encodeURIComponent(corridor.pickup_governorate)}&dropoff_governorate=${encodeURIComponent(corridor.dropoff_governorate)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" aria-hidden="true" />
                  {t.performance.publishCta}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div data-testid="performance-opportunites-vide">
            {zonesDeclarees === false ? (
              <>
                <p className="text-neutral-500 mb-3">
                  {t.performance.underservedNoZones}
                </p>
                <Link
                  data-testid="performance-declarer-zones"
                  href={`/profile/${user?.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
                >
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  {t.performance.declareZonesCta}
                </Link>
              </>
            ) : (
              <p className="text-neutral-500">
                {t.performance.underservedEmpty}
              </p>
            )}
          </div>
        )}
      </section>

      {/* T5.5 — le pendant transporteur de C5.3 : le client met en favori, le
          transporteur voit qui. Tue quand la lecture echoue (`null`) plutot
          que rendue vide : un portefeuille desert et une panne ne se disent
          pas de la meme facon. */}
      {fidelite && (
        <section className="bg-surface rounded-card shadow-card p-5">
          <h2 className="text-[17px] font-extrabold tracking-heading text-ink-900 mb-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" aria-hidden="true" />
            {t.performance.loyalTitle}
          </h2>
          <p className="text-sm text-neutral-500 mb-4">
            {t.performance.loyalHint}
          </p>

          <div className="flex flex-wrap gap-4 mb-4 text-sm text-neutral-600">
            <span data-testid="performance-fidelite-favoris">
              {interpolate(t.performance.loyalFavorited, {
                count: fidelite.favorited_by,
              })}
            </span>
            <span data-testid="performance-fidelite-recurrents">
              {interpolate(t.performance.loyalRepeat, {
                count: fidelite.repeat_clients,
              })}
            </span>
          </div>

          {fidelite.clients.length > 0 ? (
            <ul
              data-testid="performance-clients"
              className="flex flex-col gap-2"
            >
              {fidelite.clients.map((client) => (
                <li
                  key={client.client_id}
                  data-testid="performance-client-ligne"
                  className="flex flex-wrap items-center justify-between gap-3 border border-neutral-200 rounded-lg p-3"
                >
                  <div>
                    <p className="font-medium text-neutral-900 flex items-center gap-2">
                      {client.client_name}
                      {client.is_favorite && (
                        <span
                          data-testid="performance-client-favori"
                          className="inline-flex items-center gap-1 text-xs font-medium text-error-700"
                        >
                          <Heart
                            className="w-3.5 h-3.5 fill-red-600 text-error-600"
                            aria-hidden="true"
                          />
                          {t.performance.loyalFavoriteBadge}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {/* Zero mission chez un favori n'est pas « zero » : c'est
                          « interesse, jamais converti ». Deux messages
                          differents, deux libelles differents. */}
                      {client.missions > 0
                        ? interpolate(t.performance.loyalMissions, {
                            count: client.missions,
                          })
                        : t.performance.loyalNeverBooked}
                    </p>
                  </div>
                  <Link
                    href={`/profile/${client.client_id}`}
                    className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors"
                  >
                    {t.favorites.viewProfile}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p
              data-testid="performance-clients-vide"
              className="text-neutral-500"
            >
              {t.performance.loyalEmpty}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
