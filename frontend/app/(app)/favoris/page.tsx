"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import { formatDate } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import {
  getFavorites,
  toggleFavorite,
  type TransporteurFavori,
} from "@/lib/services/favorites";

/**
 * C5.3 — les transporteurs favoris du client.
 *
 * `favorites/` et `favorites/toggle/` existaient depuis P2-09 sans aucune
 * interface, ni web ni mobile. Cet écran est leur première.
 *
 * Réservé aux CLIENTS : les deux endpoints portent `RequireRole('CLIENT')`.
 */
export default function FavorisPage() {
  const { t } = useAppI18n();
  const { showToast } = useToast();
  const [favoris, setFavoris] = useState<TransporteurFavori[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [enCours, setEnCours] = useState<number | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(false);
    try {
      setFavoris(await getFavorites());
    } catch {
      setErreur(true);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const retirer = async (transporterId: number) => {
    setEnCours(transporterId);
    try {
      const resultat = await toggleFavorite(transporterId);
      // On se fie à l'état RENDU par le serveur, jamais à une inversion
      // locale : deux clics rapides désynchroniseraient l'affichage.
      if (!resultat.is_favorite) {
        setFavoris((precedents) =>
          precedents.filter((f) => f.transporter_id !== transporterId),
        );
        showToast("success", t.favorites.removed);
      } else {
        // Le serveur l'a re-créé : on relit plutôt que de deviner.
        await charger();
      }
    } catch {
      showToast("error", t.favorites.toggleError);
    } finally {
      setEnCours(null);
    }
  };

  if (chargement) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
      <header>
        <p className="text-[14.5px] leading-[1.55] text-ink-500">
          {t.favorites.subtitle}
        </p>
      </header>

      {erreur ? (
        <p data-testid="favoris-erreur" className="text-neutral-500">
          {t.favorites.loadError}
        </p>
      ) : favoris.length === 0 ? (
        <p data-testid="favoris-vide" className="text-neutral-500">
          {t.favorites.empty}
        </p>
      ) : (
        <ul data-testid="favoris-liste" className="flex flex-col gap-3">
          {favoris.map((favori) => (
            <li
              key={favori.id}
              data-testid="favoris-ligne"
              className="bg-surface rounded-card shadow-card p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="font-semibold text-neutral-900 flex items-center gap-2">
                  {favori.transporter_name}
                  {favori.is_verified && (
                    <span
                      data-testid="favoris-verifie"
                      className="inline-flex items-center gap-1 text-xs font-medium text-green-700"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                      {t.favorites.verified}
                    </span>
                  )}
                </p>
                <p className="text-sm text-neutral-500">
                  {interpolate(t.favorites.since, {
                    date: formatDate(favori.favorited_at),
                  })}
                  {/* `total_jobs_completed` est ABSENT quand le transporteur
                      n'a pas de profil de confiance : ne rien afficher plutôt
                      qu'un « 0 mission » qui le dévaloriserait à tort. */}
                  {favori.total_jobs_completed !== undefined && (
                    <>
                      {" · "}
                      {interpolate(t.favorites.jobsDone, {
                        count: favori.total_jobs_completed,
                      })}
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${favori.transporter_id}`}
                  className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors"
                >
                  {t.favorites.viewProfile}
                </Link>
                <button
                  data-testid="favoris-retirer"
                  onClick={() => void retirer(favori.transporter_id)}
                  disabled={enCours === favori.transporter_id}
                  className="px-4 py-2 border border-error-200 bg-error-50 text-error-700 rounded-lg text-sm font-medium hover:bg-error-100 transition-colors disabled:opacity-50"
                >
                  {t.favorites.remove}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
