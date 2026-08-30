"use client";

import { useCallback, useEffect, useState } from "react";
import { EyeOff, Loader2, Star } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import { formatDate } from "@/lib/format";
import { getMyReviews, type Avis } from "@/lib/services/reviews";

/**
 * C5.2 — les avis reçus par l'utilisateur connecté.
 *
 * `reviews/my/` existait côté backend sans aucune interface. Cet écran est sa
 * première.
 *
 * DOUBLE AVEUGLE (blueprint §2.5) : un avis reste masqué tant que les deux
 * parties n'ont pas noté, ou jusqu'à sept jours. La décision appartient au
 * SERVEUR — `is_revealed` — et l'écran la respecte sans jamais la contourner.
 * Afficher le contenu d'un avis non révélé ruinerait la protection contre les
 * notes de représailles.
 *
 * Aucune moyenne n'est calculée ici : c'est K8, servi par `stats.py`.
 */
export default function MesAvisPage() {
  const { t } = useAppI18n();
  const [avis, setAvis] = useState<Avis[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(false);
    try {
      setAvis(await getMyReviews());
    } catch {
      setErreur(true);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (chargement) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
          {t.myReviews.title}
        </h1>
        <p className="text-neutral-600">{t.myReviews.subtitle}</p>
      </header>

      {erreur ? (
        <p data-testid="mes-avis-erreur" className="text-neutral-500">
          {t.myReviews.loadError}
        </p>
      ) : avis.length === 0 ? (
        <p data-testid="mes-avis-vide" className="text-neutral-500">
          {t.myReviews.empty}
        </p>
      ) : (
        <>
          <p className="text-sm text-neutral-500" data-testid="mes-avis-compte">
            {interpolate(t.myReviews.count, { count: avis.length })}
          </p>

          <ul data-testid="mes-avis-liste" className="space-y-3">
            {avis.map((a) => (
              <li
                key={a.id}
                data-testid="mes-avis-ligne"
                className="bg-white rounded-xl border border-neutral-200 p-4"
              >
                {a.is_revealed ? (
                  <>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="font-medium text-neutral-900">
                        {a.reviewer_name}
                      </span>
                      <span className="text-sm text-neutral-400">
                        {formatDate(a.created_at)}
                      </span>
                    </div>
                    {a.rating !== null && (
                      <div
                        data-testid="mes-avis-note"
                        className="flex items-center gap-1 mb-2"
                        aria-label={`${a.rating}/5`}
                      >
                        {[1, 2, 3, 4, 5].map((cran) => (
                          <Star
                            key={cran}
                            className={`w-4 h-4 ${
                              cran <= (a.rating ?? 0)
                                ? "text-amber-500 fill-amber-500"
                                : "text-neutral-300"
                            }`}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                    )}
                    {a.comment && (
                      <p className="text-sm text-neutral-700">{a.comment}</p>
                    )}
                  </>
                ) : (
                  /* Le contenu n'est PAS dans la page : le serveur ne l'envoie
                     pas tant que l'avis n'est pas révélé, et l'écran ne fait
                     pas semblant de l'avoir. */
                  <div data-testid="mes-avis-masque">
                    <p className="font-medium text-neutral-900 mb-1 flex items-center gap-2">
                      <EyeOff
                        className="w-4 h-4 text-neutral-400"
                        aria-hidden="true"
                      />
                      {t.myReviews.hiddenTitle}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {t.myReviews.hiddenBody}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
