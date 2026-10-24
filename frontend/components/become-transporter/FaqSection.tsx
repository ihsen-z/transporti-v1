"use client";

import Link from "next/link";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/**
 * P4 — les objections du transporteur, et la conclusion.
 *
 * Les questions ne sont pas décoratives : elles reprennent les cinq objections
 * qui bloquent réellement une inscription — le coût, l'attente de vérification,
 * les pièces à fournir, qui fixe le prix, et le risque d'impayé. Chaque réponse
 * décrit un comportement implémenté, pas une intention.
 *
 * Rendu en `<details>` natif plutôt qu'en accordéon maison : le contenu reste
 * dans le DOM, donc lisible par un lecteur d'écran et indexable — ce qui
 * compte sur une page dont le but est l'acquisition.
 */
export function FaqSection() {
  const { t } = useAppI18n();
  const b = t.becomeTransporter;

  const questions = [
    { q: b.faqQ1, r: b.faqA1 },
    { q: b.faqQ2, r: b.faqA2 },
    { q: b.faqQ3, r: b.faqA3 },
    { q: b.faqQ4, r: b.faqA4 },
    { q: b.faqQ5, r: b.faqA5 },
  ];

  return (
    <>
      <section
        className="py-16 bg-neutral-50"
        data-testid="devenir-transporteur-faq"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-[28px] font-extrabold tracking-title text-ink-900 text-center mb-10">
            {b.faqTitle}
          </h2>

          <div className="flex flex-col gap-3">
            {questions.map(({ q, r }) => (
              <details
                key={q}
                className="group bg-surface rounded-card shadow-card p-5"
              >
                <summary className="font-semibold text-neutral-900 cursor-pointer list-none flex justify-between items-center gap-4">
                  {q}
                  <span className="text-neutral-400 group-open:rotate-45 transition-transform text-xl leading-none">
                    +
                  </span>
                </summary>
                <p className="text-sm text-neutral-500 leading-relaxed mt-3">
                  {r}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Bande de clôture : fond immersif et halos, comme le héros. Le CTA
          orange étant déjà posé en haut de page, l'action prend ici l'aplat
          blanc — la plus forte valeur possible sur bleu sans second orange. */}
      <section className="immersive relative overflow-hidden py-16">
        <div className="halo halo--green !top-[-40px]" aria-hidden />
        <div className="halo halo--orange !top-[150px]" aria-hidden />

        <div className="relative z-[1] mx-auto max-w-3xl px-5 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-[28px] font-extrabold tracking-title sm:text-[34px]">
            {b.finalTitle}
          </h2>
          <p className="mb-8 text-[16px] leading-[1.55] text-on-blue-300">
            {b.finalDesc}
          </p>
          <Link
            href="/register?role=transporter"
            data-testid="devenir-transporteur-cta-final"
            className="btn-base min-h-[56px] rounded-cta bg-white px-8 text-[16.5px] text-blue-700 shadow-glass transition-colors duration-120 hover:bg-blue-50 active:translate-y-px"
          >
            {b.finalCta}
          </Link>
        </div>
      </section>
    </>
  );
}
