"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  Truck,
  PlusCircle,
  Search,
  ShieldCheck,
  MessageSquare,
  Star,
  ChevronRight,
  X,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Onboarding Configuration                                                   */
/* -------------------------------------------------------------------------- */

interface OnboardingStep {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  cta: string;
  href: string;
  color: string;
}

const CLIENT_STEPS: OnboardingStep[] = [
  {
    id: "publish",
    icon: PlusCircle,
    title: "Publiez votre première annonce",
    description:
      "Décrivez votre besoin de transport et recevez des offres de professionnels vérifiés.",
    cta: "Publier une annonce",
    href: "/jobs/new",
    color: "from-brand-600 to-brand-800",
  },
  {
    id: "browse",
    icon: Search,
    title: "Explorez les transporteurs",
    description:
      "Consultez les profils, avis et scores de confiance avant de choisir.",
    cta: "Voir les transporteurs",
    href: "/jobs",
    color: "from-purple-600 to-purple-800",
  },
  {
    id: "profile",
    icon: Star,
    title: "Complétez votre profil",
    description:
      "Un profil complet inspire confiance et aide les transporteurs à mieux vous servir.",
    cta: "Mon profil",
    href: "/settings",
    color: "from-accent-600 to-accent-800",
  },
];

const TRANSPORTER_STEPS: OnboardingStep[] = [
  {
    id: "verify",
    icon: ShieldCheck,
    title: "Vérifiez votre identité",
    description:
      "La vérification augmente votre score de confiance de +20 points et débloque les paiements digitaux.",
    cta: "Lancer la vérification",
    href: "/verification",
    color: "from-brand-600 to-brand-800",
  },
  {
    id: "browse_jobs",
    icon: Truck,
    title: "Trouvez votre première mission",
    description:
      "Parcourez les annonces disponibles dans votre zone et soumettez des offres compétitives.",
    cta: "Voir les missions",
    href: "/jobs",
    color: "from-purple-600 to-purple-800",
  },
  {
    id: "profile",
    icon: Star,
    title: "Optimisez votre profil",
    description:
      "Ajoutez vos spécialisations, zones de service et photos de véhicule pour attirer plus de clients.",
    cta: "Mon profil",
    href: "/settings",
    color: "from-accent-600 to-accent-800",
  },
];

/* -------------------------------------------------------------------------- */
/*  Onboarding Wizard Component                                                */
/* -------------------------------------------------------------------------- */

export default function OnboardingWizard() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const storageKey = `transporti_onboarding_${user?.id}`;

  // Check if already dismissed
  useEffect(() => {
    if (typeof window !== "undefined") {
      const wasDismissed = localStorage.getItem(storageKey);
      if (wasDismissed === "true") {
        setDismissed(true);
      }
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, "true");
    }
  };

  if (dismissed || !user) return null;

  const isTransporter = user.role?.toUpperCase() === "TRANSPORTER";
  const steps = isTransporter ? TRANSPORTER_STEPS : CLIENT_STEPS;
  const step = steps[currentStep];
  const StepIcon = step.icon;

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm mb-8 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-brand-900 px-6 py-5 flex items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-center gap-3 text-white relative z-10">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">
              Bienvenue sur Transporti{user.first_name ? `, ${user.first_name}` : ""} !
            </h2>
            <p className="text-white/70 text-xs">
              {isTransporter
                ? "Commencez à recevoir des missions en 3 étapes"
                : "Trouvez un transporteur fiable en 3 étapes"}
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-white/50 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg relative z-10"
          title="Masquer le guide"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Step Progress */}
      <div className="flex gap-1 px-6 pt-4">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setCurrentStep(i)}
            className={`flex-1 h-1.5 rounded-full transition-all ${
              i === currentStep
                ? "bg-brand-600"
                : i < currentStep
                  ? "bg-brand-200"
                  : "bg-neutral-200"
            }`}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 shadow-lg`}
          >
            <StepIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Étape {currentStep + 1}/{steps.length}
              </span>
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">
              {step.title}
            </h3>
            <p className="text-sm text-neutral-500 mb-4 leading-relaxed">
              {step.description}
            </p>
            <div className="flex items-center gap-3">
              <Link
                href={step.href}
                className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-all hover:scale-[1.02] shadow-sm"
              >
                {step.cta}
                <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
              </Link>
              {currentStep < steps.length - 1 && (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="text-sm text-neutral-500 hover:text-brand-600 font-medium flex items-center gap-1"
                >
                  Passer
                  <ChevronRight className="w-4 h-4 rtl:-scale-x-100" />
                </button>
              )}
              {currentStep === steps.length - 1 && (
                <button
                  onClick={handleDismiss}
                  className="text-sm text-neutral-500 hover:text-accent-600 font-medium flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  J&apos;ai compris !
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
