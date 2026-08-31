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
    <section className="relative bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 text-white overflow-hidden">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
          <span className="w-2 h-2 bg-accent-400 rounded-full animate-pulse" />
          {b.heroBadge}
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
          {b.heroTitle1}
          <br />
          <span className="text-accent-400">{b.heroTitle2}</span>
        </h1>

        <p className="text-lg sm:text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
          {b.heroDesc}
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/register?role=transporter"
            data-testid="devenir-transporteur-cta-principal"
            className="inline-block bg-accent-500 hover:bg-accent-600 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all hover:scale-105 shadow-lg"
          >
            {b.heroCta}
          </Link>
          <Link
            href="/login"
            className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-lg border border-white/30 text-lg transition-all"
          >
            {b.heroSecondary}
          </Link>
        </div>

        <p className="text-sm text-primary-200 mt-6">{b.heroNote}</p>
      </div>
    </section>
  );
}
