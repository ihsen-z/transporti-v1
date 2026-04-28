"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16">
        {/* ================================================================
           HERO SECTION
           ================================================================ */}
        <section className="relative bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            ></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="animate-fade-in-up">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
                  <span className="w-2 h-2 bg-accent-400 rounded-full animate-pulse"></span>
                  {l.badge}
                </div>
                <h1 className="text-5xl font-bold mb-6 leading-tight">
                  {l.heroTitle1}
                  <br />
                  <span className="text-accent-400">{l.heroTitle2}</span>
                </h1>
                <p className="text-xl text-primary-100 mb-8">{l.heroDesc}</p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/jobs/new"
                    className="group bg-cta-500 hover:bg-cta-600 text-white font-semibold px-8 py-3.5 rounded-lg shadow-lg transition-all hover:scale-105 hover:shadow-xl flex items-center gap-2 animate-pulse-glow"
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
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold px-8 py-3.5 rounded-lg border border-white/30 transition-all hover:scale-105"
                  >
                    {l.ctaRegister}
                  </Link>
                  <Link
                    href="/login"
                    className="bg-transparent hover:bg-white/10 text-white/80 hover:text-white font-medium px-6 py-3.5 rounded-lg transition-all"
                  >
                    {l.ctaLogin}
                  </Link>
                </div>
                <p className="text-sm text-primary-200 mt-4">{l.trustLine}</p>
              </div>

              <div className="hidden md:block animate-fade-in-up delay-200">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent-400 to-primary-500 rounded-2xl transform rotate-3"></div>
                  <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 transform -rotate-1 animate-float">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 bg-white/20 rounded-lg p-4 hover:bg-white/25 transition-colors">
                        <div className="w-12 h-12 bg-accent-500 rounded-full flex items-center justify-center">
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
                          <div className="font-semibold">
                            {l.secureShipping}
                          </div>
                          <div className="text-sm text-primary-100">
                            {l.secureShippingDesc}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-white/20 rounded-lg p-4 hover:bg-white/25 transition-colors">
                        <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
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
                          <div className="font-semibold">
                            {l.verifiedTransporters}
                          </div>
                          <div className="text-sm text-primary-100">
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
        <section className="py-12 bg-white border-b border-neutral-100">
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
                    <div className="text-3xl mb-1 group-hover:scale-110 transition-transform duration-300">
                      {stat.icon}
                    </div>
                    <div className="text-3xl md:text-4xl font-bold text-primary-800 mb-1 group-hover:text-accent-600 transition-colors duration-300">
                      {stat.value}
                    </div>
                    <div className="text-sm text-neutral-500 font-medium">
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
        <section className="py-20 bg-neutral-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center mb-16">
              <h2 className="text-4xl font-bold text-neutral-900 mb-4">
                {l.howTitle}
              </h2>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
                {l.howSubtitle}
              </p>
            </AnimatedSection>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: l.step1Title,
                  desc: l.step1Desc,
                  color: "from-primary-500 to-primary-700",
                  bgColor: "bg-primary-50",
                },
                {
                  step: "2",
                  title: l.step2Title,
                  desc: l.step2Desc,
                  color: "from-accent-500 to-accent-700",
                  bgColor: "bg-accent-50",
                },
                {
                  step: "3",
                  title: l.step3Title,
                  desc: l.step3Desc,
                  color: "from-cta-500 to-cta-700",
                  bgColor: "bg-cta-50",
                },
              ].map((item, i) => (
                <AnimatedSection key={item.step} delay={i * 0.15}>
                  <div
                    className={`${item.bgColor} rounded-2xl p-8 relative overflow-hidden group hover-lift-scale cursor-default`}
                  >
                    <div
                      className={`absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br ${item.color} rounded-full opacity-10 group-hover:opacity-25 group-hover:scale-125 transition-all duration-500`}
                    ></div>
                    <div
                      className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center text-white font-bold text-xl mb-5 group-hover:scale-110 transition-transform duration-300`}
                    >
                      {item.step}
                    </div>
                    <h3 className="text-xl font-bold text-neutral-900 mb-3">
                      {item.title}
                    </h3>
                    <p className="text-neutral-600 leading-relaxed">
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
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center mb-16">
              <h2 className="text-4xl font-bold text-neutral-900 mb-4">
                {l.whyTitle}
              </h2>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
                {l.whySubtitle}
              </p>
            </AnimatedSection>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: l.feat1Title,
                  desc: l.feat1Desc,
                  gradient: "from-primary-50 to-primary-100",
                  iconBg: "bg-primary-700",
                  iconPath:
                    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                },
                {
                  title: l.feat2Title,
                  desc: l.feat2Desc,
                  gradient: "from-accent-50 to-accent-100",
                  iconBg: "bg-accent-600",
                  iconPath:
                    "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
                  iconPath2: "M15 11a3 3 0 11-6 0 3 3 0 016 0z",
                },
                {
                  title: l.feat3Title,
                  desc: l.feat3Desc,
                  gradient: "from-cta-50 to-cta-100",
                  iconBg: "bg-cta-600",
                  iconPath: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                },
              ].map((feature, i) => (
                <AnimatedSection key={i} delay={i * 0.12}>
                  <div
                    className={`bg-gradient-to-br ${feature.gradient} rounded-xl p-8 hover-lift-scale cursor-default group`}
                  >
                    <div
                      className={`w-14 h-14 ${feature.iconBg} rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}
                    >
                      <svg
                        className="w-8 h-8 text-white"
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
                    <h3 className="text-xl font-bold text-neutral-900 mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-neutral-700">{feature.desc}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
           TESTIMONIALS
           ================================================================ */}
        <section className="py-20 bg-neutral-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center mb-16">
              <h2 className="text-4xl font-bold text-neutral-900 mb-4">
                {l.testimonialsTitle}
              </h2>
              <p className="text-xl text-neutral-600">
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
                  <div className="bg-white rounded-2xl p-8 shadow-sm border border-neutral-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                    <div className="flex gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${star <= testimonial.rating ? "text-amber-400 fill-amber-400" : "text-neutral-200"}`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-neutral-700 mb-6 leading-relaxed italic">
                      &ldquo;{testimonial.text}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-transform duration-300">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 text-sm">
                          {testimonial.name}
                        </p>
                        <p className="text-xs text-neutral-500">
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
        <section className="py-20 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center mb-16">
              <h2 className="text-4xl font-bold text-neutral-900 mb-4">
                {l.faqTitle}
              </h2>
            </AnimatedSection>

            <div className="space-y-4">
              {[
                { q: l.faq1Q, a: l.faq1A },
                { q: l.faq2Q, a: l.faq2A },
                { q: l.faq3Q, a: l.faq3A },
                { q: l.faq4Q, a: l.faq4A },
                { q: l.faq5Q, a: l.faq5A },
              ].map((faq, i) => (
                <AnimatedSection key={i} delay={i * 0.08}>
                  <details className="group bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden transition-all duration-300 hover:border-primary-200 hover:shadow-sm">
                    <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-neutral-100 transition-colors duration-200">
                      <span className="font-semibold text-neutral-900 pr-4">
                        {faq.q}
                      </span>
                      <svg
                        className="w-5 h-5 text-neutral-400 flex-shrink-0 group-open:rotate-180 transition-transform duration-300"
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
                    <div className="px-6 pb-6 text-neutral-600 leading-relaxed animate-fade-in">
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
        <section className="py-20 bg-gradient-to-r from-primary-700 via-primary-800 to-primary-900 animate-gradient-shift relative overflow-hidden">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/5 rounded-full animate-float-slow"></div>
          <div
            className="absolute bottom-10 right-10 w-24 h-24 bg-accent-500/10 rounded-full animate-float"
            style={{ animationDelay: "1s" }}
          ></div>

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <AnimatedSection>
              <h2 className="text-4xl font-bold text-white mb-6">
                {l.ctaTitle}
              </h2>
              <p className="text-xl text-primary-100 mb-8">{l.ctaSubtitle}</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/jobs/new"
                  className="group inline-flex items-center gap-2 bg-cta-500 hover:bg-cta-600 text-white font-semibold px-10 py-4 rounded-lg shadow-xl text-lg transition-all hover:scale-105 hover:shadow-2xl animate-bounce-gentle"
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
                  className="inline-block bg-white/10 hover:bg-white/20 text-white font-semibold px-10 py-4 rounded-lg border border-white/30 text-lg transition-all hover:scale-105"
                >
                  {l.ctaFreeRegister}
                </Link>
                <Link
                  href="/register?role=transporter"
                  className="inline-block bg-white/5 hover:bg-white/15 text-white/90 hover:text-white font-semibold px-10 py-4 rounded-lg border border-white/20 text-lg transition-all"
                >
                  {l.ctaBecomeTransporter}
                </Link>
              </div>
              <p className="text-sm text-primary-200 mt-6">{l.ctaDisclaimer}</p>
            </AnimatedSection>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
