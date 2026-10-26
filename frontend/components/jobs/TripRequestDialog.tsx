"use client";

import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import type { JobDetail } from "@/lib/types/jobs";
import type { MoyenDePaiement } from "@/lib/services/jobDetail";
import { usePaymentConfig } from "@/hooks/usePaymentConfig";

interface Props {
  ouvert: boolean;
  job: JobDetail;
  description: string;
  prix: string;
  paiement: MoyenDePaiement;
  enCours: boolean;
  onDescriptionChange: (valeur: string) => void;
  onPrixChange: (valeur: string) => void;
  onPaiementChange: (valeur: MoyenDePaiement) => void;
  onFermer: () => void;
  onValider: () => void;
}

/**
 * Demande structuree sur un trajet retour, ou reservation immediate (D5, D11).
 *
 * Extraite de `jobs/[id]/page.tsx` — lot 4.1. Elle y occupait pres de deux
 * cents lignes au milieu du rendu, entre la carte du trajet et le bandeau de
 * confiance, ce qui rendait les deux illisibles.
 *
 * Composant CONTROLE : il ne detient aucun etat et n'appelle pas le reseau.
 * La page garde la saisie et l'envoi, parce que c'est elle qui sait quoi
 * afficher en cas d'echec.
 */
export function TripRequestDialog({
  ouvert,
  job,
  description,
  prix,
  paiement,
  enCours,
  onDescriptionChange,
  onPrixChange,
  onPaiementChange,
  onFermer,
  onValider,
}: Props) {
  const { t } = useAppI18n();
  // Plafond espèces lu sur le serveur (il était écrit 300 en dur ici).
  const { cod_max_amount: codMax, online_payment_enabled } = usePaymentConfig();

  if (!ouvert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-surface rounded-card shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fade-in-up">
        {/* Modal Header */}
        <div className="bg-blue-700 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {job.instant_booking
                  ? t.jobDetail.confirmBooking
                  : t.jobDetail.sendRequestTitle}
              </h3>
              <p className="text-sm text-blue-200">
                {interpolate(t.jobDetail.returnTripRef, {
                  id: job.id,
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Route summary */}
          <div className="bg-neutral-50 rounded-xl p-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <div className="w-0.5 h-5 bg-neutral-300 my-0.5" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-medium text-neutral-900">
                  {job.pickup_address}
                </p>
                <p className="font-medium text-neutral-900">
                  {job.dropoff_address}
                </p>
              </div>
            </div>
          </div>

          {/* D5 — goods description (structured request mode) */}
          {!job.instant_booking && (
            <div>
              <label className="block text-[14px] font-bold text-ink-700 mb-1.5">
                {t.jobDetail.requestDescriptionLabel}
              </label>
              <textarea
                data-testid="demande-marchandise"
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                maxLength={1000}
                className="w-full border-2 border-neutral-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all h-20"
                placeholder={t.jobDetail.requestDescriptionPlaceholder}
              />
            </div>
          )}

          {/* Price input (negotiable) */}
          <div>
            <label className="block text-[14px] font-bold text-ink-700 mb-1.5">
              {t.jobDetail.proposedPrice}
            </label>
            <div className="relative">
              <input
                data-testid="demande-prix"
                type="number"
                min="1"
                step="0.01"
                value={prix}
                onChange={(e) => onPrixChange(e.target.value)}
                className="w-full border-2 border-neutral-200 rounded-xl px-4 py-3 text-lg font-bold text-center focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                placeholder={t.jobDetail.priceExample}
              />
              <span className="absolute end-4 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-400">
                {t.jobsList.tnd}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {interpolate(t.jobDetail.transporterIndicative, {
                price: String(job.price_tnd_min || "—"),
              })}
            </p>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-[14px] font-bold text-ink-700 mb-1.5">
              {t.jobDetail.paymentMethod}
            </label>
            {/* Une colonne en mode « espèces seules » : l'option en ligne
                n'est pas rendue. */}
            <div
              className={`grid gap-2 ${online_payment_enabled ? "grid-cols-2" : "grid-cols-1"}`}
            >
              {online_payment_enabled ? (
                <button
                  type="button"
                  onClick={() => onPaiementChange("DIGITAL")}
                  className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    paiement === "DIGITAL"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  {t.jobDetail.securePayment}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onPaiementChange("COD")}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  paiement === "COD"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                }`}
              >
                <Wallet className="w-4 h-4" />
                {t.jobDetail.onDelivery}
              </button>
            </div>
            {paiement === "COD" && parseFloat(prix) > codMax && (
              <p className="text-xs text-error-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {online_payment_enabled
                  ? interpolate(t.jobDetail.codMax, { n: codMax })
                  : interpolate(t.booking.codUnavailableCashOnly, {
                      threshold: codMax,
                    })}
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-line flex gap-3">
          <button
            onClick={() => onFermer()}
            disabled={enCours}
            className="flex-1 py-3 border-2 border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-100 transition-colors"
          >
            {t.common.cancel}
          </button>
          <button
            data-testid="demande-submit"
            onClick={onValider}
            disabled={
              enCours ||
              !prix ||
              parseFloat(prix) <= 0 ||
              (!job.instant_booking && !description.trim()) ||
              (paiement === "COD" && parseFloat(prix) > codMax)
            }
            className="flex-1 py-3 bg-blue-700 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {enCours ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {t.jobDetail.booking}
              </span>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {job.instant_booking
                  ? t.jobDetail.confirm
                  : t.jobDetail.sendRequestCta}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
