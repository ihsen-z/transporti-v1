"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getTransporterProfile } from "@/lib/services/profiles";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import {
  MapPin,
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

/**
 * Une etape du guide. Elle ne porte PLUS ses textes : seulement la CLE du
 * groupe de traductions a lire.
 *
 * Pourquoi ce changement. Les libelles etaient ecrits en francais en dur dans
 * ce fichier — les seuls de l'application a l'etre. Le dictionnaire n'etant
 * jamais sollicite, la parite fr/ar verifiee a la compilation
 * (lib/i18n/parity.ts) ne pouvait rien voir : un client arabophone lisait du
 * francais sur le PREMIER ecran suivant son inscription, dans une mise en page
 * deja passee en RTL.
 */
interface OnboardingStep {
  id: string;
  icon: React.ElementType;
  /** Prefixe des cles i18n : `<cle>Title`, `<cle>Desc`, `<cle>Cta`. */
  cle: string;
  href: string;
  color: string;
}

const CLIENT_STEPS: OnboardingStep[] = [
  {
    id: "publish",
    icon: PlusCircle,
    cle: "publish",
    href: "/demandes/nouvelle",
    color: "from-brand-600 to-brand-800",
  },
  {
    id: "browse",
    icon: Search,
    cle: "browse",
    href: "/jobs",
    color: "from-purple-600 to-purple-800",
  },
  {
    id: "profile",
    icon: Star,
    cle: "profile",
    href: "/compte",
    color: "from-accent-600 to-accent-800",
  },
];

const TRANSPORTER_STEPS: OnboardingStep[] = [
  {
    id: "verify",
    icon: ShieldCheck,
    cle: "verify",
    href: "/documents",
    color: "from-brand-600 to-brand-800",
  },
  {
    id: "browse_jobs",
    icon: Truck,
    cle: "jobs",
    href: "/jobs",
    color: "from-purple-600 to-purple-800",
  },
  {
    id: "zones",
    icon: MapPin,
    cle: "zones",
    // ANCIENNE DESTINATION : /compte, qui ne contient PAS les zones. Le guide
    // envoyait le transporteur sur un ecran ou le champ qu'il nommait n'existe
    // pas. Verifie avant correction.
    //
    // Destination calculee au rendu : les zones s'editent sur le profil du
    // transporteur, dont l'URL porte son identifiant.
    href: "",
    color: "from-accent-600 to-accent-800",
  },
];

/* -------------------------------------------------------------------------- */
/*  Onboarding Wizard Component                                                */
/* -------------------------------------------------------------------------- */

export default function OnboardingWizard() {
  const { user } = useAuth();
  const { t } = useAppI18n();
  const [dismissed, setDismissed] = useState(false);
  // T0.1 — l'etape « zones » ne doit pas survivre a son accomplissement. Un
  // guide qui redemande ce qui est deja fait cesse d'etre lu.
  const [zonesDeclarees, setZonesDeclarees] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const storageKey = `transporti_onboarding_${user?.id}`;
  const stepKey = `${storageKey}_step`;

  // Check if already dismissed + restore current step across sessions (B3)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const wasDismissed = localStorage.getItem(storageKey);
      if (wasDismissed === "true") {
        setDismissed(true);
      }
      const savedStep = parseInt(localStorage.getItem(stepKey) || "0", 10);
      if (!Number.isNaN(savedStep) && savedStep > 0) {
        setCurrentStep(savedStep);
      }
    }
  }, [storageKey, stepKey]);

  // Lecture ciblee : uniquement pour un transporteur, et uniquement pour
  // savoir si l'etape « zones » a encore lieu d'etre.
  //
  // Le profil public est MIS EN CACHE 120 s cote serveur (CACHE_TTL_PROFILE).
  // L'etape peut donc survivre jusqu'a deux minutes apres la declaration des
  // zones. Ce n'est pas un defaut : c'est le TTL, et le noter ici evite qu'on
  // le rechasse comme un bug.
  useEffect(() => {
    if (user?.role?.toUpperCase() !== "TRANSPORTER" || !user?.id) return;
    let annule = false;
    void getTransporterProfile<{ service_areas?: string[] }>(user.id)
      .then((profil) => {
        if (!annule) setZonesDeclarees((profil.service_areas?.length ?? 0) > 0);
      })
      // En cas d'echec, on garde l'etape : mieux vaut la proposer une fois de
      // trop que priver un transporteur de la seule chose qui alimente les
      // opportunites de corridor.
      .catch(() => {
        if (!annule) setZonesDeclarees(false);
      });
    return () => {
      annule = true;
    };
  }, [user?.id, user?.role]);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, "true");
    }
  };

  const goToStep = (i: number) => {
    setCurrentStep(i);
    if (typeof window !== "undefined") {
      localStorage.setItem(stepKey, String(i));
    }
  };

  if (dismissed || !user) return null;

  const isTransporter = user.role?.toUpperCase() === "TRANSPORTER";
  // B3 (audit M2): never ask a VERIFIED account to verify its identity.
  const allSteps = isTransporter ? TRANSPORTER_STEPS : CLIENT_STEPS;
  const steps = allSteps.filter((s) => {
    // B3 (audit M2) : ne jamais demander a un compte VERIFIE de se verifier.
    if (s.id === "verify" && user.is_verified === true) return false;
    // T0.1 : ni de declarer des zones deja declarees.
    if (s.id === "zones" && zonesDeclarees === true) return false;
    return true;
  });
  if (steps.length === 0) return null;
  const step = steps[Math.min(currentStep, steps.length - 1)];
  // L'etape « zones » pointe le profil de l'utilisateur, dont l'URL depend de
  // son identifiant : impossible a ecrire dans une liste statique.
  const destination = step.id === "zones" ? `/profile/${user.id}` : step.href;
  const StepIcon = step.icon;

  // Les textes de l'etape courante, lus dans le groupe correspondant a son
  // role. Le `Record<string, string>` est necessaire parce que la cle est
  // calculee : `t.onboarding.client` et `t.onboarding.transporter` ont des
  // formes differentes, et l'index les ramene a leur point commun — des
  // chaines. La parite fr/ar reste garantie par lib/i18n/parity.ts.
  const textes = (isTransporter
    ? t.onboarding.transporter
    : t.onboarding.client) as unknown as Record<string, string>;
  const titreEtape = textes[`${step.cle}Title`];
  const descriptionEtape = textes[`${step.cle}Desc`];
  const ctaEtape = textes[`${step.cle}Cta`];

  return (
    <div
      data-testid="guide-demarrage"
      className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm mb-8 animate-fade-in"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-brand-900 px-6 py-5 flex items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-center gap-3 text-white relative z-10">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">
              {user.first_name
                ? interpolate(t.onboarding.welcomeNamed, {
                    prenom: user.first_name,
                  })
                : t.onboarding.welcome}
            </h2>
            <p className="text-white/70 text-xs">
              {isTransporter
                ? t.onboarding.subtitleTransporter
                : t.onboarding.subtitleClient}
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-white/50 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg relative z-10"
          title={t.onboarding.dismiss}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Step Progress */}
      <div className="flex gap-1 px-6 pt-4">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goToStep(i)}
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
                {interpolate(t.onboarding.stepCounter, {
                  courante: currentStep + 1,
                  total: steps.length,
                })}
              </span>
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">
              {titreEtape}
            </h3>
            <p className="text-sm text-neutral-500 mb-4 leading-relaxed">
              {descriptionEtape}
            </p>
            <div className="flex items-center gap-3">
              <Link
                href={destination}
                className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition-all hover:scale-[1.02] shadow-sm"
              >
                {ctaEtape}
                <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
              </Link>
              {currentStep < steps.length - 1 && (
                <button
                  onClick={() => goToStep(currentStep + 1)}
                  className="text-sm text-neutral-500 hover:text-brand-600 font-medium flex items-center gap-1"
                >
                  {t.onboarding.skip}
                  <ChevronRight className="w-4 h-4 rtl:-scale-x-100" />
                </button>
              )}
              {currentStep === steps.length - 1 && (
                <button
                  onClick={handleDismiss}
                  className="text-sm text-neutral-500 hover:text-accent-600 font-medium flex items-center gap-1"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {t.onboarding.understood}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
