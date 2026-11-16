"use client";

import { AlertTriangle, Search, Scale } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/**
 * « Confiance et sécurité » — le recours quand quelque chose se passe mal.
 *
 * Décrire ce qui arrive quand ça se passe mal rassure plus que promettre que
 * tout ira bien. Trois faits :
 * - les motifs sont ceux de `Dispute.Reason` ;
 * - l'équipe examine les éléments des deux parties ;
 * - en espèces, Transporti ne détient aucun argent : un litige ne déclenche
 *   donc ni remboursement ni versement. Le dire évite une fausse attente.
 *
 * Le litige est ouvrable PAR LES DEUX PARTIES (`DisputeCreateView`).
 */
export function DisputeSection() {
  const { t } = useAppI18n();
  const p = t.trustPage;

  const points = [
    {
      icone: AlertTriangle,
      titre: p.disputeReasonsTitle,
      texte: p.disputeReasons,
    },
    {
      icone: Search,
      titre: p.disputeReviewTitle,
      texte: p.disputeReviewDesc,
    },
    { icone: Scale, titre: p.disputeLimitTitle, texte: p.disputeLimitDesc },
  ];

  return (
    <section className="py-16 bg-white" data-testid="confiance-litiges">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-[28px] font-extrabold tracking-title text-ink-900 text-center mb-3">
          {p.disputeTitle}
        </h2>
        <p className="text-neutral-500 text-center max-w-2xl mx-auto mb-10">
          {p.disputeDesc}
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
      </div>
    </section>
  );
}
