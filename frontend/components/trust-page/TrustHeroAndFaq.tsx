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
    <section className="immersive relative overflow-hidden">
      <div className="halo halo--green !top-[40px]" aria-hidden />
      <div className="halo halo--orange !top-[200px]" aria-hidden />

      <div className="relative z-[1] mx-auto max-w-4xl px-5 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/[0.16] px-3.5 py-1.5 text-[12.5px] font-semibold">
          <span className="h-2 w-2 rounded-full bg-green-300" />
          {p.heroBadge}
        </div>

        <h1 className="mb-5 text-[34px] font-extrabold leading-[1.12] tracking-title sm:text-[44px]">
          {p.heroTitle1}
          <br />
          <span className="text-green-300">{p.heroTitle2}</span>
        </h1>

        <p className="mx-auto max-w-2xl text-[16px] leading-[1.55] text-on-blue-300">
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
          <h2 className="text-[28px] font-extrabold tracking-title text-ink-900 text-center mb-10">
            {p.faqTitle}
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

      <section className="immersive relative overflow-hidden py-16">
        <div className="halo halo--orange !top-[-30px]" aria-hidden />

        <div className="relative z-[1] mx-auto max-w-3xl px-5 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-[28px] font-extrabold tracking-title sm:text-[34px]">
            {p.finalTitle}
          </h2>
          <p className="mb-8 text-[16px] leading-[1.55] text-on-blue-300">
            {p.finalDesc}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/demandes/nouvelle"
              data-testid="confiance-cta-publier"
              className="cta btn-base px-8"
            >
              {p.finalCta}
            </Link>
            <Link href="/recherche" className="btn-base btn-ghost-on-blue px-8">
              {p.finalSecondary}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
