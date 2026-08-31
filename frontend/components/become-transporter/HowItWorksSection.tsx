"use client";

import { useAppI18n } from "@/lib/i18n/useAppI18n";

/**
 * P4 — le parcours réel du transporteur, en quatre étapes.
 *
 * La page d'accueil décrit « 3 étapes simples pour envoyer vos colis » : c'est
 * le parcours CLIENT, et un transporteur qui le lit n'y trouve pas son rôle.
 * Ces quatre étapes suivent le flux réellement implémenté — publication d'un
 * trajet retour, réception des demandes du corridor, réponse
 * (accepter / refuser / contre-proposer), puis confirmation de livraison par
 * code et photo qui libère l'escrow.
 */
export function HowItWorksSection() {
  const { t } = useAppI18n();
  const b = t.becomeTransporter;

  const etapes = [
    { titre: b.howStep1Title, texte: b.howStep1Desc },
    { titre: b.howStep2Title, texte: b.howStep2Desc },
    { titre: b.howStep3Title, texte: b.howStep3Desc },
    { titre: b.howStep4Title, texte: b.howStep4Desc },
  ];

  return (
    <section
      className="py-16 bg-neutral-50"
      data-testid="devenir-transporteur-etapes"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-neutral-900 text-center mb-10">
          {b.howTitle}
        </h2>

        <ol className="grid sm:grid-cols-2 gap-6">
          {etapes.map((etape, index) => (
            <li
              key={etape.titre}
              className="bg-white rounded-2xl border border-neutral-200 p-6 flex gap-4"
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
      </div>
    </section>
  );
}
