"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import { usePaymentConfig } from "@/hooks/usePaymentConfig";
import { RETURN_TRIPS_FIRST } from "@/lib/flags";

/* ============================================================================
   Scroll-Animated Section Wrapper
   ============================================================================ */
function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollAnimation(0.1);
  return (
    <div
      ref={ref}
      className={`scroll-reveal ${isVisible ? "visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

/* ============================================================================
   HOME PAGE
   ============================================================================ */
export default function Home() {
  const { t } = useAppI18n();
  const l = t.landing;
  // La FAQ cite le plafond espèces du serveur (route publique).
  const { cod_max_amount } = usePaymentConfig();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16">
        {/* ================================================================
           HERO SECTION
           ================================================================ */}
        <section className="immersive relative overflow-hidden">
          {/* Deux halos de lumiere : la signature du fond immersif */}
          <div className="halo halo--green !top-[60px]" aria-hidden />
          <div className="halo halo--orange !top-[240px]" aria-hidden />

          <div className="relative z-[1] mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="animate-fade-in-up">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/[0.16] px-3.5 py-1.5 text-[12.5px] font-semibold">
                  <span className="h-2 w-2 rounded-full bg-green-300" />
                  {l.badge}
                </div>
                <h1 className="mb-5 text-[34px] font-extrabold leading-[1.12] tracking-title sm:text-[44px]">
                  {RETURN_TRIPS_FIRST ? l.pivotHeroTitle1 : l.heroTitle1}
                  <br />
                  <span className="text-green-300">
                    {RETURN_TRIPS_FIRST ? l.pivotHeroTitle2 : l.heroTitle2}
                  </span>
                </h1>
                <p className="mb-8 max-w-lg text-[16px] leading-[1.55] text-on-blue-300">
                  {RETURN_TRIPS_FIRST ? l.pivotHeroDesc : l.heroDesc}
                </p>

                {/* CTA Buttons — pivot: dual promise (transporter + client) */}
                {RETURN_TRIPS_FIRST ? (
                  <>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href="/login?redirect=/retours/nouveau"
                        className="cta btn-base"
                        id="hero-cta-publish-trip"
                      >
                        🚚 {l.pivotCtaTransporter}
                      </Link>
                      <Link
                        href="/login?redirect=/recherche"
                        className="btn-base btn-ghost-on-blue"
                        id="hero-cta-find-trip"
                      >
                        🔍 {l.pivotCtaClient}
                      </Link>
                      <Link
                        href="/login"
                        className="btn-base min-h-[56px] px-5 text-[16.5px] text-on-blue-300 transition-colors hover:text-white"
                      >
                        {l.ctaLogin}
                      </Link>
                    </div>
                    <ul className="mt-4 flex list-none flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-on-blue-300">
                      {[l.pivotTrust1, l.pivotTrust2, l.pivotTrust3].map(
                        (repere) => (
                          <li
                            key={repere}
                            className="inline-flex items-center gap-1.5"
                          >
                            <Check
                              className="h-3.5 w-3.5 flex-shrink-0 text-green-300"
                              strokeWidth={2.6}
                            />
                            {repere}
                          </li>
                        ),
                      )}
                    </ul>
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href="/login?redirect=/demandes/nouvelle"
                        className="cta btn-base"
                        id="hero-cta-publish"
                      >
                        <svg
                          className="w-5 h-5 transition-transform group-hover:rotate-12"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        {l.ctaPublish}
                      </Link>
                      <Link
                        href="/register"
                        className="btn-base btn-ghost-on-blue"
                      >
                        {l.ctaRegister}
                      </Link>
                      <Link
                        href="/login"
                        className="btn-base min-h-[56px] px-5 text-[16.5px] text-on-blue-300 transition-colors hover:text-white"
                      >
                        {l.ctaLogin}
                      </Link>
                    </div>
                    <ul className="mt-4 flex list-none flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-on-blue-300">
                      {[l.trust1, l.trust2, l.trust3].map((repere) => (
                        <li
                          key={repere}
                          className="inline-flex items-center gap-1.5"
                        >
                          <Check
                            className="h-3.5 w-3.5 flex-shrink-0 text-green-300"
                            strokeWidth={2.6}
                          />
                          {repere}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <div className="hidden md:block animate-fade-in-up delay-200">
                <div className="relative">
                  <div className="glass">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3 rounded-field border border-white/[0.24] bg-white/[0.16] p-4">
                        <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-green-500">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="text-[15px] font-bold">
                            {l.secureShipping}
                          </div>
                          <div className="text-[13px] text-on-blue-300">
                            {l.secureShippingDesc}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-field border border-white/[0.24] bg-white/[0.16] p-4">
                        <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-blue-600">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                          </svg>
                        </div>
                        <div>
                          <div className="text-[15px] font-bold">
                            {l.verifiedTransporters}
                          </div>
                          <div className="text-[13px] text-on-blue-300">
                            {l.verifiedTransportersDesc}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
           STATS
           ================================================================ */}
        <section className="border-b border-line bg-surface py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: l.stat1Value, label: l.stat1Label, icon: "🚛" },
                { value: l.stat2Value, label: l.stat2Label, icon: "📦" },
                { value: l.stat3Value, label: l.stat3Label, icon: "📍" },
                { value: l.stat4Value, label: l.stat4Label, icon: "⭐" },
              ].map((stat, i) => (
                <AnimatedSection key={i} delay={i * 0.1}>
                  <div className="group cursor-default">
                    <div className="text-3xl mb-1 group-transition-transform duration-300">
                      {stat.icon}
                    </div>
                    <div className="figure-hero mb-1 text-blue-800">
                      {stat.value}
                    </div>
                    <div className="text-[12.5px] font-semibold text-ink-500">
                      {stat.label}
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
           HOW IT WORKS
           ================================================================ */}
        <section className="bg-app py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center mb-16">
              <h2 className="mb-4 text-[28px] font-extrabold tracking-title text-ink-900 sm:text-[34px]">
                {l.howTitle}
              </h2>
              <p className="mx-auto max-w-2xl text-[16px] leading-[1.55] text-ink-500">
                {l.howSubtitle}
              </p>
            </AnimatedSection>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: l.step1Title,
                  desc: l.step1Desc,
                  color: "bg-blue-700",
                  bgColor: "bg-primary-50",
                },
                {
                  step: "2",
                  title: l.step2Title,
                  desc: l.step2Desc,
                  color: "bg-green-500",
                  bgColor: "bg-accent-50",
                },
                {
                  step: "3",
                  title: l.step3Title,
                  desc: l.step3Desc,
                  color: "bg-orange-500",
                  bgColor: "bg-cta-50",
                },
              ].map((item, i) => (
                <AnimatedSection key={item.step} delay={i * 0.15}>
                  <div className="card hover-lift flex h-full flex-col gap-3 p-6">
                    <div
                      className={`grid h-12 w-12 place-items-center rounded-tile text-[19px] font-extrabold text-white ${item.color}`}
                    >
                      {item.step}
                    </div>
                    <h3 className="text-[17px] font-extrabold tracking-heading text-ink-900">
                      {item.title}
                    </h3>
                    <p className="text-[14.5px] leading-[1.55] text-ink-500">
                      {item.desc}
                    </p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
           FEATURES
           ================================================================ */}
        <section className="bg-surface py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center mb-16">
              <h2 className="mb-4 text-[28px] font-extrabold tracking-title text-ink-900 sm:text-[34px]">
                {l.whyTitle}
              </h2>
              <p className="mx-auto max-w-2xl text-[16px] leading-[1.55] text-ink-500">
                {l.whySubtitle}
              </p>
            </AnimatedSection>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: l.feat1Title,
                  desc: l.feat1Desc,
                  iconBg: "bg-primary-700",
                  iconPath:
                    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                },
                {
                  title: l.feat2Title,
                  desc: l.feat2Desc,
                  iconBg: "bg-accent-600",
                  iconPath:
                    "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
                  iconPath2: "M15 11a3 3 0 11-6 0 3 3 0 016 0z",
                },
                {
                  title: l.feat3Title,
                  desc: l.feat3Desc,
                  iconBg: "bg-cta-600",
                  iconPath: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                },
              ].map((feature, i) => (
                <AnimatedSection key={i} delay={i * 0.12}>
                  <div className="card hover-lift flex h-full flex-col gap-3 p-6">
                    <div
                      className={`mb-2 grid h-12 w-12 place-items-center rounded-tile ${feature.iconBg}`}
                    >
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={feature.iconPath}
                        />
                        {"iconPath2" in feature && feature.iconPath2 && (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={feature.iconPath2}
                          />
                        )}
                      </svg>
                    </div>
                    <h3 className="text-[17px] font-extrabold tracking-heading text-ink-900">
                      {feature.title}
                    </h3>
                    <p className="text-[14.5px] leading-[1.55] text-ink-500">
                      {feature.desc}
                    </p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
           TESTIMONIALS
           ================================================================ */}
        <section className="bg-app py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center mb-16">
              <h2 className="mb-4 text-[28px] font-extrabold tracking-title text-ink-900 sm:text-[34px]">
                {l.testimonialsTitle}
              </h2>
              <p className="text-[16px] leading-[1.55] text-ink-500">
                {l.testimonialsSubtitle}
              </p>
            </AnimatedSection>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  name: l.review1Name,
                  role: l.review1Role,
                  text: l.review1Text,
                  rating: 5,
                },
                {
                  name: l.review2Name,
                  role: l.review2Role,
                  text: l.review2Text,
                  rating: 5,
                },
                {
                  name: l.review3Name,
                  role: l.review3Role,
                  text: l.review3Text,
                  rating: 5,
                },
              ].map((testimonial, i) => (
                <AnimatedSection key={i} delay={i * 0.12}>
                  <div className="card hover-lift flex h-full flex-col p-6">
                    <div className="flex gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`h-4 w-4 ${star <= testimonial.rating ? "fill-warning-400 text-warning-400" : "text-neutral-200"}`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="mb-6 flex-1 text-[14.5px] italic leading-[1.55] text-ink-700">
                      &ldquo;{testimonial.text}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-blue-700 text-[14px] font-bold text-white">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-ink-900">
                          {testimonial.name}
                        </p>
                        <p className="text-[12.5px] text-ink-500">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
           FAQ
           ================================================================ */}
        <section className="bg-surface py-16 lg:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center mb-16">
              <h2 className="mb-4 text-[28px] font-extrabold tracking-title text-ink-900 sm:text-[34px]">
                {l.faqTitle}
              </h2>
            </AnimatedSection>

            <div className="flex flex-col gap-3">
              {[
                { q: l.faq1Q, a: l.faq1A },
                { q: l.faq2Q, a: l.faq2A },
                { q: l.faq3Q, a: l.faq3A },
                {
                  q: l.faq4Q,
                  a: interpolate(l.faq4A, { cap: cod_max_amount }),
                },
                { q: l.faq5Q, a: l.faq5A },
              ].map((faq, i) => (
                <AnimatedSection key={i} delay={i * 0.08}>
                  <details className="group overflow-hidden rounded-card bg-surface shadow-card">
                    <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 transition-colors hover:bg-app">
                      <span className="text-[15.5px] font-bold text-ink-900">
                        {faq.q}
                      </span>
                      <svg
                        className="h-4 w-4 flex-shrink-0 text-ink-300 transition-transform duration-180 group-open:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </summary>
                    <div className="animate-fade-in px-5 pb-5 text-[14.5px] leading-[1.55] text-ink-500">
                      {faq.a}
                    </div>
                  </details>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
           CTA SECTION
           ================================================================ */}
        <section className="immersive relative overflow-hidden py-16 lg:py-20">
          <div className="halo halo--green !top-[-40px]" aria-hidden />
          <div className="halo halo--orange !top-[180px]" aria-hidden />

          <div className="relative z-[1] mx-auto max-w-4xl px-5 text-center sm:px-6 lg:px-8">
            <AnimatedSection>
              <h2 className="mb-5 text-[28px] font-extrabold tracking-title text-white sm:text-[34px]">
                {l.ctaTitle}
              </h2>
              <p className="mb-8 text-[16px] leading-[1.55] text-on-blue-300">
                {l.ctaSubtitle}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/login?redirect=/demandes/nouvelle"
                  className="btn-base min-h-[56px] rounded-cta bg-white px-8 text-[16.5px] text-blue-700 shadow-glass transition-colors hover:bg-blue-50 active:translate-y-px"
                  id="footer-cta-publish"
                >
                  <svg
                    className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  {l.ctaPublish}
                </Link>
                <Link
                  href="/register"
                  className="btn-base btn-ghost-on-blue px-8"
                >
                  {l.ctaFreeRegister}
                </Link>
                <Link
                  href="/register?role=transporter"
                  className="btn-base btn-ghost-on-blue px-8"
                >
                  {l.ctaBecomeTransporter}
                </Link>
              </div>
              <p className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-on-blue-300">
                <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                {l.ctaDisclaimer}
              </p>
            </AnimatedSection>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
