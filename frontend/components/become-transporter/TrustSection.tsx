"use client";

import { ShieldCheck, Lock, BadgeCheck } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/**
 * P4 — ce que la vérification débloque réellement.
 *
 * **Aucune promesse de points de score ici.** L'assistant d'onboarding
 * annonçait « +20 points de score de confiance » : c'était faux, le score n'a
 * aucune composante de vérification (achèvement 30, litiges 20, paiement 25,
 * engagement 15, récence 10 = 100). La phrase a été corrigée avant cette page.
 *
 * Ce qui est énoncé ici est appliqué par le code :
 * - `check_transporter_trust(..., require_verified=True)` bloque l'acceptation
 *   d'une offre (logistics/services.py:285) ;
 * - l'escrow numérique exige un transporteur vérifié
 *   (payments/services.py:507) ;
 * - le paiement en espèces exige un score minimum de 50
 *   (COD_MIN_TRUST_SCORE).
 *
 * Le premier point est formulé comme un BLOCAGE, pas comme un avantage : un
 * transporteur non vérifié qui croit pouvoir travailler perdra du temps sur des
 * offres qui ne peuvent aboutir.
 */
export function TrustSection() {
  const { t } = useAppI18n();
  const b = t.becomeTransporter;

  const points = [
    { icone: ShieldCheck, titre: b.trustOffers, texte: b.trustOffersDesc },
    { icone: Lock, titre: b.trustEscrow, texte: b.trustEscrowDesc },
    { icone: BadgeCheck, titre: b.trustBadge, texte: b.trustBadgeDesc },
  ];

  return (
    <section
      className="py-16 bg-white"
      data-testid="devenir-transporteur-confiance"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-neutral-900 text-center mb-3">
          {b.trustTitle}
        </h2>
        <p className="text-neutral-500 text-center max-w-2xl mx-auto mb-10">
          {b.trustDesc}
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {points.map(({ icone: Icone, titre, texte }) => (
            <div
              key={titre}
              className="rounded-2xl border border-neutral-200 p-6"
            >
              <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center mb-4">
                <Icone className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-neutral-900 mb-1">{titre}</h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                {texte}
              </p>
            </div>
          ))}
        </div>

        {/* Condition supplémentaire du paiement en espèces. Elle est vraie et
            elle surprend : mieux vaut la lire ici que la découvrir bloqué. */}
        <p className="text-sm text-neutral-500 text-center mt-8 max-w-2xl mx-auto">
          {b.trustCod}
        </p>
      </div>
    </section>
  );
}
