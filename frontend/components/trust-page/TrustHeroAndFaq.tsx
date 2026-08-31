"use client";

import Link from "next/link";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import { GARANTIES_AFFICHEES } from "@/lib/garanties";

/**
 * P3 — l'ouverture et la clôture de la page « Confiance et sécurité ».
 *
 * Les deux vivent dans le même fichier parce qu'elles disent la même chose aux
 * deux bouts : la promesse en une phrase, puis les objections qui restent.
 */
export function TrustHero() {
  const { t } = useAppI18n();
  const p = t.trustPage;

  return (
    <section className="relative bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 text-white overflow-hidden">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
          <span className="w-2 h-2 bg-accent-400 rounded-full animate-pulse" />
          {p.heroBadge}
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
          {p.heroTitle1}
          <br />
          <span className="text-accent-400">{p.heroTitle2}</span>
        </h1>

        <p className="text-lg text-primary-100 max-w-2xl mx-auto">
          {p.heroDesc}
        </p>
      </div>
    </section>
  );
}

export function TrustFaq() {
  const { t } = useAppI18n();
  const p = t.trustPage;

  // Le délai apparaît deux fois sur la page — dans l'encart du séquestre et
  // ici. Les deux lisent la même constante : un désaccord entre les deux
  // serait pire que l'absence de l'information.
  const heures = GARANTIES_AFFICHEES.ESCROW_AUTO_RELEASE_HOURS;

  const questions = [
    { q: p.faqQ1, r: p.faqA1 },
    { q: p.faqQ2, r: p.faqA2 },
    { q: p.faqQ3, r: p.faqA3 },
    { q: p.faqQ4, r: interpolate(p.faqA4, { heures }) },
    { q: p.faqQ5, r: p.faqA5 },
  ];

  return (
    <>
      <section className="py-16 bg-neutral-50" data-testid="confiance-faq">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-neutral-900 text-center mb-10">
            {p.faqTitle}
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
          <h2 className="text-3xl font-bold mb-3">{p.finalTitle}</h2>
          <p className="text-primary-100 mb-8">{p.finalDesc}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/demandes/nouvelle"
              data-testid="confiance-cta-publier"
              className="inline-block bg-accent-500 hover:bg-accent-600 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all hover:scale-105 shadow-lg"
            >
              {p.finalCta}
            </Link>
            <Link
              href="/recherche"
              className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-lg border border-white/30 text-lg transition-all"
            >
              {p.finalSecondary}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
