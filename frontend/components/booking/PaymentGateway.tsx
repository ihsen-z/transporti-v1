"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Smartphone,
  Building2,
  Lock,
  XCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/client";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface PaymentGatewayProps {
  amount: number;
  jobId?: number;
  onCancel: () => void;
}

type PaymentStatus = "idle" | "processing" | "error";

/*
 * Le paiement passe par la passerelle configurée côté serveur :
 * POST /api/payments/initiate/ retourne un `payment_url` vers lequel
 * l'utilisateur est redirigé. La saisie de carte se fait sur la plateforme
 * de paiement (jamais sur Transporti — conformité PCI), et le retour se fait
 * sur /jobs/{id}?payment=success|failed, géré par la page de détail du job.
 */

const SUPPORTED_METHODS: {
  label: string;
  icon: React.ElementType;
  desc: string;
}[] = [
  { label: "Carte bancaire", icon: CreditCard, desc: "Visa, Mastercard" },
  { label: "E-Dinar", icon: Smartphone, desc: "La Poste Tunisienne" },
  { label: "Sobflous", icon: Smartphone, desc: "Paiement mobile" },
  { label: "D17", icon: Building2, desc: "Virement bancaire" },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function PaymentGateway({ amount, jobId, onCancel }: PaymentGatewayProps) {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handlePay = async () => {
    if (!jobId) {
      setStatus("error");
      setErrorMessage(
        "Référence de mission manquante. Rechargez la page et réessayez.",
      );
      return;
    }

    setStatus("processing");
    setErrorMessage("");

    try {
      const response = await apiClient.post<{
        payment_url: string;
        gateway_ref: string;
      }>("/api/payments/initiate/", {
        job_id: jobId,
        platform: "web",
      });

      if (response.payment_url) {
        // Redirection vers la plateforme de paiement ; le retour arrive sur
        // /jobs/{id}?payment=success|failed.
        window.location.href = response.payment_url;
      } else {
        setStatus("error");
        setErrorMessage(
          "La plateforme de paiement n'a pas répondu. Veuillez réessayer.",
        );
      }
    } catch (error: unknown) {
      setStatus("error");
      setErrorMessage(
        (error instanceof ApiError &&
          (error.body?.error || error.body?.detail)) ||
          "Erreur lors de l'initialisation du paiement.",
      );
    }
  };

  // Error screen
  if (status === "error") {
    return (
      <div role="alert" className="text-center py-12 space-y-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">
          Paiement impossible
        </h3>
        <p className="text-sm text-neutral-500">
          {errorMessage ||
            "Une erreur est survenue lors du traitement. Veuillez réessayer."}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setStatus("idle")}
            className="px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors"
          >
            Réessayer
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Amount */}
      <div className="bg-brand-600/5 border border-brand-600/20 rounded-xl p-4 text-center">
        <p className="text-sm text-brand-600 font-medium">Montant à payer</p>
        <p className="text-3xl font-bold text-brand-600 mt-1">
          {amount.toFixed(2)} TND
        </p>
        <p className="text-xs text-brand-600 mt-1">
          Prix fixe garanti — aucun frais caché
        </p>
      </div>

      {/* How it works */}
      <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
        <p className="text-sm text-neutral-700 font-medium flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-brand-600" />
          Vous allez être redirigé vers notre plateforme de paiement sécurisée.
        </p>
        <p className="text-xs text-neutral-500">
          Vos informations bancaires sont saisies uniquement sur la plateforme
          de paiement — jamais sur Transporti. Le montant est conservé en
          escrow et libéré au transporteur après confirmation de la livraison.
        </p>
      </div>

      {/* Supported methods */}
      <div>
        <p className="block text-sm font-medium text-neutral-700 mb-2">
          Moyens de paiement acceptés
        </p>
        <div className="grid grid-cols-2 gap-2">
          {SUPPORTED_METHODS.map((m) => (
            <div
              key={m.label}
              className="p-3 rounded-xl border border-neutral-200 text-left"
            >
              <div className="flex items-center gap-2">
                <m.icon className="w-5 h-5 text-neutral-400" />
                <span className="text-sm font-medium text-neutral-700">
                  {m.label}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1 ml-7">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Escrow note */}
      <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
        <ShieldCheck className="w-4 h-4 text-accent-600" />
        <span>Paiement protégé par le système d&apos;escrow Transporti</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={status === "processing"}
          className="flex-1 px-4 py-3 border border-neutral-300 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          onClick={handlePay}
          disabled={status === "processing"}
          className="flex-1 px-4 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === "processing" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirection...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Payer {amount.toFixed(2)} TND
            </>
          )}
        </button>
      </div>
    </div>
  );
}
