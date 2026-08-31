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
          <h2 className="text-3xl font-bold text-neutral-900 text-center mb-10">
            {b.faqTitle}
          </h2>

          <div className="space-y-3">
            {questions.map(({ q, r }) => (
              <details
                key={q}
                className="group bg-white rounded-xl border border-neutral-200 p-5"
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

      <section className="py-16 bg-primary-800 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-3">{b.finalTitle}</h2>
          <p className="text-primary-100 mb-8">{b.finalDesc}</p>
          <Link
            href="/register?role=transporter"
            data-testid="devenir-transporteur-cta-final"
            className="inline-block bg-accent-500 hover:bg-accent-600 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all hover:scale-105 shadow-lg"
          >
            {b.finalCta}
          </Link>
        </div>
      </section>
    </>
  );
}
