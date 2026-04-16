"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-react";
import { AuthLogo } from "@/components/brand/TransportiLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    // Simulate API call — backend endpoint not yet implemented
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-900 px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <AuthLogo />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Mot de passe oublié
        </h1>
        <p className="text-blue-200 text-sm">
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>
      </div>

      <div className="px-6 py-8">
        {submitted ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-accent-50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-accent-600" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900">
              Email envoyé !
            </h2>
            <p className="text-sm text-neutral-500 max-w-sm mx-auto">
              Si un compte existe avec l&apos;adresse{" "}
              <strong className="text-neutral-700">{email}</strong>, vous
              recevrez un lien de réinitialisation sous quelques minutes.
            </p>
            <p className="text-xs text-neutral-400">
              Pensez à vérifier vos spams.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium mt-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="reset-email"
                className="block text-sm font-medium text-neutral-700 mb-1"
              >
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email}
              className="w-full flex items-center justify-center gap-2 bg-accent-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                "Envoyer le lien de réinitialisation"
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
