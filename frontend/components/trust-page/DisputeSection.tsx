"use client";

import { AlertTriangle, Snowflake, Scale } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/**
 * P3 — le recours quand quelque chose se passe mal.
 *
 * C'est la section qui lève réellement l'objection : promettre que « tout se
 * passe bien » ne rassure personne, décrire ce qui arrive quand ça se passe
 * mal, oui.
 *
 * Trois faits, tous vérifiés :
 * - les motifs sont ceux de `Dispute.Reason` (dégâts, absence, paiement,
 *   retard, harcèlement, fraude, autre) ;
 * - un litige ouvert gèle le versement, y compris le versement automatique à
 *   48 h — c'est ce qui rend ce délai acceptable, et les deux sections se
 *   répondent volontairement ;
 * - la résolution déclenche le mouvement d'argent DANS la même transaction
 *   (`ResolutionOutcome` : REFUND_CLIENT, RELEASE_TRANSPORTER, SPLIT). Ce
 *   détail d'implémentation vaut d'être dit au client : il signifie qu'une
 *   décision en sa faveur ne peut pas être prise puis oubliée.
 *
 * Le litige est présenté comme ouvrable PAR LES DEUX PARTIES, ce qui est le
 * cas (`DisputeCreateView`). Le présenter comme un recours réservé au client
 * serait faux, et donnerait de la plateforme une image d'arbitre partial.
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
      icone: Snowflake,
      titre: p.disputeFreezeTitle,
      texte: p.disputeFreezeDesc,
    },
    { icone: Scale, titre: p.disputeOutcomeTitle, texte: p.disputeOutcomeDesc },
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
