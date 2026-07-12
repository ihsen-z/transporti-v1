"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Lock,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { AuthLogo } from "@/components/brand/TransportiLogo";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch || !passwordLongEnough) return;

    setIsSubmitting(true);
    setError("");

    try {
      const { apiClient } = await import("@/lib/api/client");
      await apiClient.post("/api/auth/password-reset/confirm/", {
        uid,
        token,
        new_password: newPassword,
      });
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

  if (!isValid) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-600 to-brand-900 px-6 py-8 text-center">
          <AuthLogo />
          <h1 className="text-2xl font-bold text-white mt-3">
            {t.resetPassword.invalidTitle}
          </h1>
        </div>
        <div className="px-6 py-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-neutral-600">
            {t.resetPassword.invalidDesc}
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.resetPassword.requestNewLink}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
      <div className="bg-gradient-to-r from-brand-600 to-brand-900 px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <AuthLogo />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          {t.resetPassword.title}
        </h1>
        <p className="text-blue-200 text-sm">
          {t.resetPassword.subtitle}
        </p>
      </div>

      <div className="px-6 py-8">
        {success ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-accent-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-accent-600" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900">
              {t.resetPassword.successTitle}
            </h2>
            <p className="text-sm text-neutral-500">
              {t.resetPassword.successDesc}
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-accent-500 hover:bg-accent-600 px-5 py-2.5 rounded-xl transition-all mt-2"
            >
              {t.auth.loginButton}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                {t.resetPassword.newPasswordLabel}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t.resetPassword.newPasswordPlaceholder}
                  className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                {t.auth.passwordConfirmLabel}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.resetPassword.confirmPasswordPlaceholder}
                  className={`w-full pl-11 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-accent-500 transition-colors ${
                    confirmPassword && !passwordsMatch
                      ? "border-red-300 focus:border-red-500"
                      : "border-neutral-300 focus:border-accent-500"
                  }`}
                  required
                />
              </div>
              {confirmPassword && !passwordsMatch && (
                <p className="text-red-500 text-xs mt-1">
                  {t.resetPassword.passwordsMismatch}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !passwordsMatch || !passwordLongEnough}
              className="w-full flex items-center justify-center gap-2 bg-accent-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.resetPassword.resetting}
                </>
              ) : (
                t.resetPassword.resetButton
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t.resetPassword.backToLogin}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
