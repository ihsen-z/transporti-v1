"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, getDefaultRedirect } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { useSocialAuth } from "@/hooks/useSocialAuth";
import {
  AuthCard,
  AuthDivider,
  AuthError,
  AuthFooterLink,
  AuthHeading,
  AuthLabel,
} from "@/components/auth/AuthScreen";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import { CONNEXION_SOCIALE_ACTIVE } from "@/lib/socialProviders";
import type { UserRole } from "@/lib/auth";

/* -------------------------------------------------------------------------- */
/*  Connexion — FAMILLE IMMERSIVE                                             */
/*  Le dégradé et les halos viennent de app/(auth)/layout.tsx ; cette page    */
/*  ne pose que le titre, la carte verre et le CTA orange unique de l'écran.  */
/* -------------------------------------------------------------------------- */

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<
    "google" | "facebook" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const { loginWithCredentials } = useAuth();
  const { loginWithGoogle, loginWithFacebook } = useSocialAuth();
  const { showToast } = useToast();
  const { t } = useAppI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Show session expired toast when redirected from session guard
  useEffect(() => {
    if (searchParams.get("expired") === "true") {
      showToast("warning", t.auth.sessionExpired);
    }
  }, [searchParams, showToast]);

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError(t.auth.fillAllFields);
      return;
    }

    setIsLoading(true);
    const result = await loginWithCredentials(email, password);

    if (result.success) {
      showToast("success", t.auth.loginSuccess);
      const userRole = result.role || "client";
      const redirectTo =
        searchParams.get("redirect") || getDefaultRedirect(userRole);
      router.push(redirectTo);
    } else {
      setError(result.error || t.auth.loginError);
    }

    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    if (isSocialLoading) return;
    setIsSocialLoading("google");
    setError(null);

    const result = await loginWithGoogle();

    if (result.success) {
      if (result.isNewUser) {
        // New social user → role selection first
        router.push("/select-role");
      } else {
        const userRole = (result.role || "client") as UserRole;
        const redirectTo =
          searchParams.get("redirect") || getDefaultRedirect(userRole);
        router.push(redirectTo);
      }
    }

    setIsSocialLoading(null);
  };

  const handleFacebookLogin = async () => {
    if (isSocialLoading) return;
    setIsSocialLoading("facebook");
    setError(null);

    const result = await loginWithFacebook();

    if (result.success) {
      if (result.isNewUser) {
        // New social user → role selection first
        router.push("/select-role");
      } else {
        const userRole = (result.role || "client") as UserRole;
        const redirectTo =
          searchParams.get("redirect") || getDefaultRedirect(userRole);
        router.push(redirectTo);
      }
    }

    setIsSocialLoading(null);
  };

  const isAnyLoading = isLoading || !!isSocialLoading;

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle} />

      <AuthCard>
        <form onSubmit={handleRealLogin} className="flex flex-col gap-5">
          {error && <AuthError message={error} />}

          {/* --- Adresse email --------------------------------------- */}
          <div className="flex flex-col gap-[7px]">
            <AuthLabel htmlFor="email">{t.auth.emailLabel}</AuthLabel>
            <input
              data-testid="login-email"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.auth.emailPlaceholder}
              className="glass-field"
              autoComplete="email"
              required
              disabled={isAnyLoading}
            />
          </div>

          {/* --- Mot de passe ---------------------------------------- */}
          <div className="flex flex-col gap-[7px]">
            <AuthLabel
              htmlFor="password"
              action={
                <Link
                  href="/forgot-password"
                  className="text-[12.5px] font-semibold text-white underline-offset-4 transition-opacity hover:opacity-80 hover:underline"
                >
                  {t.auth.forgotPassword}
                </Link>
              }
            >
              {t.auth.passwordLabel}
            </AuthLabel>
            <div className="relative">
              <input
                data-testid="login-password"
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="glass-field pe-[86px]"
                autoComplete="current-password"
                required
                disabled={isAnyLoading}
              />
              {/* Lien « Afficher » à droite du champ (charte §3) */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-[15px] top-1/2 -translate-y-1/2 text-[12.5px] font-semibold text-white underline-offset-4 transition-opacity hover:opacity-80 hover:underline"
              >
                {showPassword ? t.auth.hidePassword : t.auth.showPassword}
              </button>
            </div>
          </div>

          {/* --- CTA UNIQUE de l'écran ------------------------------- */}
          <button
            type="submit"
            data-testid="login-submit"
            disabled={isAnyLoading}
            className="cta btn-base mt-1 w-full disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span
                  className="h-[18px] w-[18px] animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden
                />
                {t.auth.loggingIn}
              </>
            ) : (
              t.auth.loginButton
            )}
          </button>
        </form>
      </AuthCard>

      {/* Le séparateur « ou continuer avec » n'a de sens que s'il y a un
          bouton social derrière (voir lib/socialProviders.ts). */}
      {CONNEXION_SOCIALE_ACTIVE ? (
        <>
          <AuthDivider label={t.auth.orContinueWith} />

          <SocialAuthButtons
            onGoogle={handleGoogleLogin}
            onFacebook={handleFacebookLogin}
            loadingProvider={isSocialLoading}
            disabled={isAnyLoading}
          />
        </>
      ) : null}

      <AuthFooterLink
        question={t.auth.noAccount}
        href="/register"
        action={t.auth.register}
      />
    </div>
  );
}
