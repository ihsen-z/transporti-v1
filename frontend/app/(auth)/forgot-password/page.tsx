"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { AuthCard, AuthHeading, AuthLabel } from "@/components/auth/AuthScreen";

/* -------------------------------------------------------------------------- */
/*  Mot de passe oublié — FAMILLE IMMERSIVE                                   */
/*  État envoyé : pastille verre + coche verte (le vert porte la valeur), pas */
/*  de CTA orange — l'écran n'attend plus d'action principale.                */
/* -------------------------------------------------------------------------- */

export default function ForgotPasswordPage() {
  const { t } = useAppI18n();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      // Import dynamique conserve : le service n est charge qu a l envoi.
      const { requestPasswordReset } = await import("@/lib/services/auth");
      await requestPasswordReset(email.trim().toLowerCase());
    } catch {
      // Always show success to prevent email enumeration
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title={t.forgotPassword.title}
        subtitle={t.forgotPassword.subtitle}
      />

      {submitted ? (
        <AuthCard className="items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-green-500/25 ring-1 ring-inset ring-green-300/40">
            <Check className="h-8 w-8 text-green-300" strokeWidth={2.5} />
          </span>

          <h2 className="text-[19px] font-extrabold tracking-heading text-white">
            {t.forgotPassword.emailSentTitle}
          </h2>

          <p className="max-w-sm text-[14.5px] leading-[1.55] text-on-blue-300">
            {t.forgotPassword.emailSentBefore}{" "}
            <strong className="font-bold text-white">{email}</strong>
            {t.forgotPassword.emailSentAfter}
          </p>

          <p className="info-banner info-banner--on-blue w-full text-start">
            {t.forgotPassword.checkSpam}
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[14px] font-bold text-white underline-offset-4 transition-opacity hover:opacity-80 hover:underline"
          >
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
            {t.forgotPassword.backToLogin}
          </Link>
        </AuthCard>
      ) : (
        <>
          <AuthCard>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-[7px]">
                <AuthLabel htmlFor="reset-email">{t.auth.emailLabel}</AuthLabel>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth.emailPlaceholder}
                  className="glass-field"
                  autoComplete="email"
                  required
                />
              </div>

              {/* CTA UNIQUE de l'écran */}
              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="cta btn-base mt-1 w-full disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-[18px] w-[18px] animate-spin" />
                    {t.forgotPassword.sending}
                  </>
                ) : (
                  t.forgotPassword.sendLink
                )}
              </button>
            </form>
          </AuthCard>

          <p className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-[14px] text-on-blue-300 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
              {t.forgotPassword.backToLogin}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
