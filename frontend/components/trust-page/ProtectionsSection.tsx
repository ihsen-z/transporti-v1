"use client";

import { Banknote, KeyRound, Star, Info } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/**
 * « Confiance et sécurité » — ce qui protège réellement l'utilisateur.
 *
 * Le service ouvre en ESPÈCES SEULES : le client paie le transporteur à la
 * livraison, Transporti ne retient aucun argent. Cette section dit donc ce
 * qui existe (paiement à la réception, code de livraison, avis) et, tout
 * aussi important, ce que la plateforme ne fait pas : une page de confiance
 * qui promet un séquestre inexistant est pire que pas de page.
 */
export function ProtectionsSection() {
  const { t } = useAppI18n();
  const p = t.trustPage;

  const points = [
    { icone: Banknote, titre: p.protect1Title, texte: p.protect1Desc },
    { icone: KeyRound, titre: p.protect2Title, texte: p.protect2Desc },
    { icone: Star, titre: p.protect3Title, texte: p.protect3Desc },
    { icone: Info, titre: p.protect4Title, texte: p.protect4Desc },
  ];

  return (
    <section className="py-16 bg-white" data-testid="confiance-protections">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-[28px] font-extrabold tracking-title text-ink-900 text-center mb-10">
          {p.protectionsTitle}
        </h2>

        <div className="grid sm:grid-cols-2 gap-6">
          {points.map(({ icone: Icone, titre, texte }) => (
            <div
              key={titre}
              className="bg-neutral-50 rounded-2xl border border-neutral-200 p-6 flex gap-4"
            >
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center">
                <Icone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 mb-1">{titre}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  {texte}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
