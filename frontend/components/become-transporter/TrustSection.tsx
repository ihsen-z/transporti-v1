"use client";

import { ShieldCheck, Banknote, BadgeCheck } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { useCanalClassiqueOuvert } from "@/hooks/usePlatformConfig";

/**
 * Ce que la vérification débloque réellement.
 *
 * Aucune promesse de points de score : le score de confiance n'a aucune
 * composante de vérification.
 *
 * Ce qui est énoncé ici est appliqué par le serveur :
 * - `ensure_transporter_verified` (backend/logistics/kyc.py) refuse en 403
 *   `KYC_REQUIRED` la publication d'un trajet retour, une offre, et
 *   l'acceptation ou la contre-proposition sur une demande, tant que le
 *   transporteur n'est pas VERIFIED (sauf dérogation admin) ;
 * - le lancement se fait en espèces seules : le client paie le transporteur à
 *   la livraison, il n'y a ni paiement en ligne ni séquestre.
 *
 * Le premier point est formulé comme un BLOCAGE, pas comme un avantage : un
 * transporteur non vérifié qui croit pouvoir travailler perdra du temps sur des
 * offres qui ne peuvent aboutir.
 */
export function TrustSection() {
  const { t } = useAppI18n();
  const b = t.becomeTransporter;
  // Canal classique fermé : il n'y a plus d'offre à rendre acceptable.
  const canalClassique = useCanalClassiqueOuvert();

  const points = [
    canalClassique
      ? { icone: ShieldCheck, titre: b.trustOffers, texte: b.trustOffersDesc }
      : {
          icone: ShieldCheck,
          titre: b.trustOffersReturn,
          texte: b.trustOffersReturnDesc,
        },
    { icone: Banknote, titre: b.trustCash, texte: b.trustCashDesc },
    { icone: BadgeCheck, titre: b.trustBadge, texte: b.trustBadgeDesc },
  ];

  return (
    <section
      className="py-16 bg-white"
      data-testid="devenir-transporteur-confiance"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-[28px] font-extrabold tracking-title text-ink-900 text-center mb-3">
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
