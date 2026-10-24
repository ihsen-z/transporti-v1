"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Check, AlertTriangle } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import {
  AuthCard,
  AuthError,
  AuthHeading,
  AuthLabel,
  PasswordStrength,
} from "@/components/auth/AuthScreen";

/* -------------------------------------------------------------------------- */
/*  Nouveau mot de passe — FAMILLE IMMERSIVE                                  */
/*  Porte la jauge de force de la charte : 4 segments de 3px + appréciation.   */
/* -------------------------------------------------------------------------- */

/** Score de 0 à 4 — purement indicatif, l'exigence serveur reste 8 caractères. */
function scorePassword(value: string): number {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value) && /[^\w\s]/.test(value)) score++;
  return Math.min(score, 4);
}

export default function ResetPasswordPage() {
  const { t } = useAppI18n();
  const params = useSearchParams();
  const uid = params.get("uid") || "";
  const token = params.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const isValid = uid && token;
  const passwordsMatch = newPassword === confirmPassword;
  const passwordLongEnough = newPassword.length >= 8;

  const strength = scorePassword(newPassword);
  const strengthLabel = [
    "",
    t.resetPassword.strengthWeak,
    t.resetPassword.strengthFair,
    t.resetPassword.strengthGood,
    t.resetPassword.strengthStrong,
  ][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch || !passwordLongEnough) return;

    setIsSubmitting(true);
    setError("");

    try {
      // Import dynamique conserve : le service n est charge qu a l envoi.
      const { confirmPasswordReset } = await import("@/lib/services/auth");
      await confirmPasswordReset(uid, token, newPassword);
      setSuccess(true);
    } catch (err: unknown) {
      const { ApiError } = await import("@/lib/api/client");
      setError(
        (err instanceof ApiError && err.body?.error) ||
          t.resetPassword.linkInvalidError,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --- Lien invalide ou expiré ------------------------------------- */
  if (!isValid) {
    return (
      <div className="flex flex-col gap-6">
        <AuthHeading title={t.resetPassword.invalidTitle} />

        <AuthCard className="items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-error-500/25 ring-1 ring-inset ring-error-300/40">
            <AlertTriangle className="h-8 w-8 text-white" strokeWidth={2} />
          </span>

          <p className="text-[14.5px] leading-[1.55] text-on-blue-300">
            {t.resetPassword.invalidDesc}
          </p>

          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 text-[14px] font-bold text-white underline-offset-4 transition-opacity hover:opacity-80 hover:underline"
          >
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
            {t.resetPassword.requestNewLink}
          </Link>
        </AuthCard>
      </div>
    );
  }

  /* --- Succès ------------------------------------------------------ */
  if (success) {
    return (
      <div className="flex flex-col gap-6">
        <AuthHeading title={t.resetPassword.title} />

        <AuthCard className="items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-green-500/25 ring-1 ring-inset ring-green-300/40">
            <Check className="h-8 w-8 text-green-300" strokeWidth={2.5} />
          </span>

          <h2 className="text-[19px] font-extrabold tracking-heading text-white">
            {t.resetPassword.successTitle}
          </h2>

          <p className="text-[14.5px] leading-[1.55] text-on-blue-300">
            {t.resetPassword.successDesc}
          </p>

          {/* CTA UNIQUE de l'écran */}
          <Link href="/login" className="cta btn-base mt-1 w-full">
            {t.auth.loginButton}
          </Link>
        </AuthCard>
      </div>
    );
  }

  /* --- Formulaire -------------------------------------------------- */
  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title={t.resetPassword.title}
        subtitle={t.resetPassword.subtitle}
      />

      <AuthCard>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && <AuthError message={error} />}

          {/* --- Nouveau mot de passe -------------------------------- */}
          <div className="flex flex-col gap-[7px]">
            <AuthLabel htmlFor="new-password">
              {t.resetPassword.newPasswordLabel}
            </AuthLabel>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t.resetPassword.newPasswordPlaceholder}
              className="glass-field"
              autoComplete="new-password"
              minLength={8}
              required
            />
            {newPassword && (
              <PasswordStrength score={strength} label={strengthLabel} />
            )}
          </div>

          {/* --- Confirmation ---------------------------------------- */}
          <div className="flex flex-col gap-[7px]">
            <AuthLabel htmlFor="confirm-password">
              {t.auth.passwordConfirmLabel}
            </AuthLabel>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.resetPassword.confirmPasswordPlaceholder}
              aria-invalid={
                confirmPassword && !passwordsMatch ? true : undefined
              }
              aria-describedby={
                confirmPassword && !passwordsMatch
                  ? "confirm-password-error"
                  : undefined
              }
              className={`glass-field ${
                confirmPassword && !passwordsMatch
                  ? "border-error-300 bg-error-500/20"
                  : ""
              }`}
              autoComplete="new-password"
              required
            />
            {confirmPassword && !passwordsMatch && (
              <p
                id="confirm-password-error"
                role="alert"
                className="text-[12.5px] font-medium text-error-200"
              >
                {t.resetPassword.passwordsMismatch}
              </p>
            )}
          </div>

          {/* --- CTA UNIQUE de l'écran ------------------------------- */}
          <button
            type="submit"
            disabled={isSubmitting || !passwordsMatch || !passwordLongEnough}
            className="cta btn-base mt-1 w-full disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-[18px] w-[18px] animate-spin" />
                {t.resetPassword.resetting}
              </>
            ) : (
              t.resetPassword.resetButton
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
          {t.resetPassword.backToLogin}
        </Link>
      </p>
    </div>
  );
}
