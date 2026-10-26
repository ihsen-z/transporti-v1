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
    color: "bg-blue-700",
  },
  {
    id: "browse",
    icon: Search,
    cle: "browse",
    href: "/jobs",
    color: "bg-blue-700",
  },
  {
    id: "profile",
    icon: Star,
    cle: "profile",
    href: "/compte",
    color: "bg-green-500",
  },
];

const TRANSPORTER_STEPS: OnboardingStep[] = [
  {
    id: "verify",
    icon: ShieldCheck,
    cle: "verify",
    href: "/documents",
    color: "bg-blue-700",
  },
  {
    id: "browse_jobs",
    icon: Truck,
    cle: "jobs",
    href: "/jobs",
    color: "bg-blue-700",
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
    color: "bg-green-500",
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
      className="card card--flush animate-fade-in overflow-hidden"
    >
      {/* En-tête — carte BLANCHE : l'écran ne porte qu'un seul bandeau bleu,
          celui du haut. Un second bandeau ici se lirait comme un doublon.
          La pastille bleue suffit à rattacher le bloc à la marque. */}
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-chip bg-blue-50 text-blue-700">
            <Sparkles className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-[17px] font-extrabold leading-[1.25] tracking-heading text-ink-900">
              {user.first_name
                ? interpolate(t.onboarding.welcomeNamed, {
                    prenom: user.first_name,
                  })
                : t.onboarding.welcome}
            </h2>
            <p className="text-[13px] text-ink-500">
              {isTransporter
                ? t.onboarding.subtitleTransporter
                : t.onboarding.subtitleClient}
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-chip text-ink-300 transition-colors hover:bg-app hover:text-ink-500"
          title={t.onboarding.dismiss}
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Step Progress */}
      <div className="stepper-track px-5 pt-5 sm:px-6">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goToStep(i)}
            aria-current={i === currentStep ? "step" : undefined}
            className={`stepper-seg transition-colors duration-120 ${
              i === currentStep
                ? "stepper-seg--current"
                : i < currentStep
                  ? "stepper-seg--done"
                  : ""
            }`}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div
            className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-tile ${step.color}`}
          >
            <StepIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-300 tabular">
                {interpolate(t.onboarding.stepCounter, {
                  courante: currentStep + 1,
                  total: steps.length,
                })}
              </span>
            </div>
            <h3 className="text-[17px] font-extrabold tracking-heading text-ink-900 mb-1">
              {titreEtape}
            </h3>
            <p className="mb-4 text-[14.5px] leading-[1.55] text-ink-500">
              {descriptionEtape}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Link
                href={destination}
                className="btn-base min-h-[44px] rounded-cta bg-blue-700 px-4 text-[14.5px] text-white shadow-blue transition-colors duration-120 hover:bg-blue-800 active:translate-y-px"
              >
                {ctaEtape}
                <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
              </Link>
              {currentStep < steps.length - 1 && (
                <button
                  onClick={() => goToStep(currentStep + 1)}
                  className="flex items-center gap-1 text-[13px] font-semibold text-ink-500 transition-colors hover:text-blue-700"
                >
                  {t.onboarding.skip}
                  <ChevronRight className="w-4 h-4 rtl:-scale-x-100" />
                </button>
              )}
              {currentStep === steps.length - 1 && (
                <button
                  onClick={handleDismiss}
                  className="flex items-center gap-1 text-[13px] font-semibold text-ink-500 transition-colors hover:text-green-600"
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
