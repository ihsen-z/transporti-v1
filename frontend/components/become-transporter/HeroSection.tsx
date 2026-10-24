"use client";

import Link from "next/link";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/**
 * P4 — l'ouverture de la page « Devenir transporteur ».
 *
 * La page d'accueil s'adresse aux deux publics à la fois : son hero doit tenir
 * la promesse client ET la promesse transporteur en une phrase. Ici, il n'y a
 * qu'un seul lecteur, et l'argument peut être dit sans compromis.
 *
 * Le CTA mène à `/register?role=transporter`. Ce paramètre était ignoré par la
 * page d'inscription — le lien créait des comptes CLIENT — ce qui a été corrigé
 * avant cette page : la livrer sans ce correctif aurait industrialisé le
 * défaut.
 */
export function HeroSection() {
  const { t } = useAppI18n();
  const b = t.becomeTransporter;

  return (
    <section className="immersive relative overflow-hidden">
      <div className="halo halo--green !top-[40px]" aria-hidden />
      <div className="halo halo--orange !top-[220px]" aria-hidden />

      <div className="relative z-[1] mx-auto max-w-4xl px-5 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/[0.16] px-3.5 py-1.5 text-[12.5px] font-semibold">
          <span className="h-2 w-2 rounded-full bg-green-300" />
          {b.heroBadge}
        </div>

        <h1 className="mb-5 text-[34px] font-extrabold leading-[1.12] tracking-title sm:text-[44px]">
          {b.heroTitle1}
          <br />
          <span className="text-green-300">{b.heroTitle2}</span>
        </h1>

        <p className="mx-auto mb-8 max-w-2xl text-[16px] leading-[1.55] text-on-blue-300">
          {b.heroDesc}
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/register?role=transporter"
            data-testid="devenir-transporteur-cta-principal"
            className="cta btn-base px-8"
          >
            {b.heroCta}
          </Link>
          <Link href="/login" className="btn-base btn-ghost-on-blue px-8">
            {b.heroSecondary}
          </Link>
        </div>

        <p className="mt-6 text-[13px] text-on-blue-300">{b.heroNote}</p>
      </div>
    </section>
  );
}
