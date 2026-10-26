"use client";

import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { TAUX_COMMISSION_AFFICHES, pourcentage } from "@/lib/commissions";

/**
 * P4 — la commission réduite sur les trajets retour.
 *
 * **Le seul chiffre mis en avant de toute la page**, et c'est délibéré : c'est
 * le seul qui soit une RÈGLE de la plateforme (`settings.COMMISSION_RATES`) et
 * non une projection. Annoncer un gain moyen supposerait un volume de
 * transactions que la plateforme n'a pas ; l'inventer serait exactement le
 * défaut qui a coûté la grille tarifaire du déménagement.
 *
 * Les valeurs viennent de `lib/commissions.ts`, aligné sur le backend par un
 * test qui échoue en cas de dérive.
 */
export function CommissionSection() {
  const { t } = useAppI18n();
  const b = t.becomeTransporter;

  const taux = [
    {
      cle: "retour",
      valeur: TAUX_COMMISSION_AFFICHES.RETURN_TRIP,
      libelle: b.commissionReturn,
      miseEnAvant: true,
    },
    {
      cle: "transport",
      valeur: TAUX_COMMISSION_AFFICHES.TRANSPORT,
      libelle: b.commissionTransport,
      miseEnAvant: false,
    },
    {
      cle: "demenagement",
      valeur: TAUX_COMMISSION_AFFICHES.MOVING,
      libelle: b.commissionMoving,
      miseEnAvant: false,
    },
  ];

  return (
    <section
      className="py-16 bg-white"
      data-testid="devenir-transporteur-commission"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-[28px] font-extrabold tracking-title text-ink-900 text-center mb-3">
          {b.commissionTitle}
        </h2>
        <p className="text-neutral-500 text-center max-w-2xl mx-auto mb-10">
          {b.commissionDesc}
        </p>

        <div className="grid sm:grid-cols-3 gap-4">
          {taux.map((ligne) => (
            <div
              key={ligne.cle}
              data-testid={`commission-${ligne.cle}`}
              className={`rounded-2xl border p-6 text-center ${
                ligne.miseEnAvant
                  ? "border-accent-500 bg-accent-50 shadow-sm"
                  : "border-neutral-200 bg-white"
              }`}
            >
              <p
                className={`text-4xl font-bold mb-1 ${
                  ligne.miseEnAvant ? "text-accent-600" : "text-neutral-400"
                }`}
              >
                {pourcentage(ligne.valeur)}
              </p>
              <p
                className={`text-sm ${
                  ligne.miseEnAvant
                    ? "text-accent-800 font-medium"
                    : "text-neutral-500"
                }`}
              >
                {ligne.libelle}
              </p>
            </div>
          ))}
        </div>

        {/* La commission n'est pas une surprise : le net est annoncé avant
            acceptation. Le dire ici évite la lecture « on me prend 8 % en
            plus », qui est la crainte spontanée. */}
        <p className="text-sm text-neutral-500 text-center mt-6 max-w-2xl mx-auto">
          {b.commissionFootnote}
        </p>
      </div>
    </section>
  );
}
