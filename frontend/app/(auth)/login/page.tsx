"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { AuthLogo } from "@/components/brand/TransportiLogo";
import { useAuth, getDefaultRedirect } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { useSocialAuth } from "@/hooks/useSocialAuth";
import type { UserRole } from "@/lib/auth";

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
      showToast(
        "warning",
        t.auth.sessionExpired,
      );
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
    <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-900 px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <AuthLogo />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {t.auth.loginTitle}
        </h1>
        <p className="text-blue-200 text-sm">
          {t.auth.loginSubtitle}
        </p>
      </div>

      <>
        {/* Real Login Form */}
        <form onSubmit={handleRealLogin} className="px-6 pt-6 pb-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              {t.auth.emailLabel}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.auth.emailPlaceholder}
                className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                autoComplete="email"
                required
                disabled={isAnyLoading}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-700"
              >
                {t.auth.passwordLabel}
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
              >
                {t.auth.forgotPassword}
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-12 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                autoComplete="current-password"
                required
                disabled={isAnyLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isAnyLoading}
            className="w-full flex items-center justify-center gap-2 bg-accent-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t.auth.loggingIn}
              </>
            ) : (
              <>
                {t.auth.loginButton}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Social Login Divider */}
        <div className="px-6 pb-2">
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-neutral-200"></div>
            <span className="flex-shrink-0 mx-4 text-xs text-neutral-400 uppercase tracking-wide">
              {t.auth.orContinueWith}
            </span>
            <div className="flex-grow border-t border-neutral-200"></div>
          </div>

          {/* Social Login Buttons — Active */}
          <div className="grid grid-cols-2 gap-3 pt-2 pb-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isAnyLoading}
              className="relative flex items-center justify-center gap-2 px-4 py-3 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-700 bg-white hover:bg-neutral-50 hover:border-neutral-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSocialLoading === "google" ? (
                <div className="w-5 h-5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Google
            </button>
            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={isAnyLoading}
              className="relative flex items-center justify-center gap-2 px-4 py-3 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-700 bg-white hover:bg-neutral-50 hover:border-neutral-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSocialLoading === "facebook" ? (
                <div className="w-5 h-5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                    fill="#1877F2"
                  />
                </svg>
              )}
              Facebook
            </button>
          </div>
        </div>
      </>

      {/* Footer Links */}
      <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 text-center">
        <p className="text-sm text-neutral-500">
          {t.auth.noAccount}{" "}
          <Link
            href="/register"
            className="text-accent-600 hover:text-accent-700 font-medium"
          >
            {t.auth.register}
          </Link>
        </p>
      </div>
    </div>
  );
}
