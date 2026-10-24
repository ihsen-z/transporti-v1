"use client";

import { FileCheck2, Eye, Banknote } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import { GARANTIES_AFFICHEES } from "@/lib/garanties";

/**
 * P3 — qui sont les transporteurs.
 *
 * La liste des pièces est celle de `trust.models.DocumentType` : carte
 * d'identité, permis, carte grise et assurance, recto et verso pour chacune.
 * Elle n'est pas décorative — un client qui hésite veut savoir ce qui a été
 * contrôlé, pas qu'on lui dise « nos transporteurs sont vérifiés ».
 *
 * Le blocage énoncé est réel : `check_transporter_trust(...,
 * require_verified=True)` empêche l'acceptation d'une offre par un
 * transporteur non vérifié.
 *
 * La condition du paiement en espèces est dite ici parce qu'elle explique
 * pourquoi tous les transporteurs ne proposent pas ce mode : sans cela, le
 * client l'interprète comme une défaillance de la plateforme.
 */
export function VerificationSection() {
  const { t } = useAppI18n();
  const p = t.trustPage;

  const points = [
    { icone: FileCheck2, titre: p.verifDocsTitle, texte: p.verifDocsList },
    { icone: Eye, titre: p.verifBadgeTitle, texte: p.verifBadgeDesc },
    {
      icone: Banknote,
      titre: p.verifCodTitle,
      texte: interpolate(p.verifCodDesc, {
        score: GARANTIES_AFFICHEES.COD_MIN_TRUST_SCORE,
      }),
    },
  ];

  return (
    <section
      className="py-16 bg-neutral-50"
      data-testid="confiance-verification"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-[28px] font-extrabold tracking-title text-ink-900 text-center mb-3">
          {p.verifTitle}
        </h2>
        <p className="text-neutral-500 text-center max-w-2xl mx-auto mb-10">
          {p.verifDesc}
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {points.map(({ icone: Icone, titre, texte }) => (
            <div
              key={titre}
              className="rounded-2xl border border-neutral-200 bg-white p-6"
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
