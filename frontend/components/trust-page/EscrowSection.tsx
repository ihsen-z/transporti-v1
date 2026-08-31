"use client";

import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import { GARANTIES_AFFICHEES } from "@/lib/garanties";

/**
 * P3 — le séquestre, étape par étape.
 *
 * Les quatre étapes suivent la machine à états réelle d'`EscrowTransaction`
 * (`INITIATED → HELD → RELEASED`), et la preuve de livraison décrite ici — un
 * code à 4 chiffres plus une photo — est celle qu'exige `Booking.delivery_pin`
 * et l'événement `DELIVERED`.
 *
 * **Le délai de versement automatique est ANNONCÉ, pas caché.** C'est le seul
 * fait de cette page qui puisse jouer contre le client : sans confirmation de
 * sa part, l'argent part au bout de 48 h. Une page de confiance qui tait la
 * seule chose susceptible de surprendre ne mérite pas son nom — et le client
 * le découvrirait de toute façon, au pire moment. Il est donc énoncé avec sa
 * raison d'être (un client injoignable bloquerait un paiement légitime) et
 * avec le garde-fou qui le rend acceptable (un litige ouvert le suspend, ce
 * qui est vrai : `get_escrow_eligible_for_auto_release` exclut les litiges
 * OPEN/INVESTIGATING).
 */
export function EscrowSection() {
  const { t } = useAppI18n();
  const p = t.trustPage;

  const etapes = [
    { titre: p.escrowStep1Title, texte: p.escrowStep1Desc },
    { titre: p.escrowStep2Title, texte: p.escrowStep2Desc },
    { titre: p.escrowStep3Title, texte: p.escrowStep3Desc },
    { titre: p.escrowStep4Title, texte: p.escrowStep4Desc },
  ];

  return (
    <section className="py-16 bg-white" data-testid="confiance-escrow">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-neutral-900 text-center mb-10">
          {p.escrowTitle}
        </h2>

        <ol className="grid sm:grid-cols-2 gap-6">
          {etapes.map((etape, index) => (
            <li
              key={etape.titre}
              className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6 flex gap-4"
            >
              <span className="flex-shrink-0 w-9 h-9 rounded-full bg-primary-700 text-white font-bold flex items-center justify-center">
                {index + 1}
              </span>
              <div>
                <h3 className="font-bold text-neutral-900 mb-1">
                  {etape.titre}
                </h3>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  {etape.texte}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div
          className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6"
          data-testid="confiance-delai"
        >
          <h3 className="font-bold text-amber-900 mb-2">
            {p.escrowDelayTitle}
          </h3>
          <p className="text-sm text-amber-800 leading-relaxed mb-2">
            {interpolate(p.escrowDelayDesc, {
              heures: GARANTIES_AFFICHEES.ESCROW_AUTO_RELEASE_HOURS,
            })}
          </p>
          <p className="text-sm text-amber-900 font-medium leading-relaxed">
            {p.escrowDelayGuard}
          </p>
        </div>
      </div>
    </section>
  );
}
