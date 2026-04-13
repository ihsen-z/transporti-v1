"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Smartphone,
  Building2,
  Lock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface PaymentGatewayProps {
  amount: number;
  jobId?: number;
  offerId?: number;
  onSuccess: (transactionId: string) => void;
  onCancel: () => void;
}

type PaymentMethod = "card" | "edinar" | "sobflous" | "d17";
type PaymentStatus = "idle" | "processing" | "success" | "error";

const METHODS: {
  id: PaymentMethod;
  label: string;
  icon: React.ElementType;
  desc: string;
}[] = [
  {
    id: "card",
    label: "Carte bancaire",
    icon: CreditCard,
    desc: "Visa, Mastercard",
  },
  {
    id: "edinar",
    label: "E-Dinar",
    icon: Smartphone,
    desc: "La Poste Tunisienne",
  },
  {
    id: "sobflous",
    label: "Sobflous",
    icon: Smartphone,
    desc: "Paiement mobile",
  },
  { id: "d17", label: "D17", icon: Building2, desc: "Virement bancaire" },
];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function PaymentGateway({
  amount,
  jobId,
  offerId,
  onSuccess,
  onCancel,
}: PaymentGatewayProps) {
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handlePay = async () => {
    setStatus("processing");
    setErrorMessage("");

    try {
      const response = await apiClient.post<{
        transaction_id: string;
        status: string;
      }>("/api/payments/process/", {
        amount,
        method,
        job_id: jobId,
        offer_id: offerId,
      });

      setStatus("success");
      const txnId = response.transaction_id || `TXN-${Date.now()}`;
      setTimeout(() => onSuccess(txnId), 1500);
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(
        error?.body?.detail || "Erreur lors du traitement du paiement.",
      );
    }
  };

  // Success screen
  if (status === "success") {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">
          Paiement confirmé !
        </h3>
        <p className="text-sm text-neutral-500">
          Votre paiement de <strong>{amount.toFixed(2)} TND</strong> a été
          traité avec succès.
        </p>
        <p className="text-xs text-neutral-400">Redirection en cours...</p>
      </div>
    );
  }

  // Error screen
  if (status === "error") {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900">
          Paiement échoué
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

      {/* Method selector */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Mode de paiement
        </label>
        <div className="grid grid-cols-2 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                method === m.id
                  ? "border-brand-600 bg-brand-600/5"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <m.icon
                  className={`w-5 h-5 ${method === m.id ? "text-brand-600" : "text-neutral-400"}`}
                />
                <span
                  className={`text-sm font-medium ${method === m.id ? "text-brand-600" : "text-neutral-700"}`}
                >
                  {m.label}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 ml-7">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Card fields (shown for card method) */}
      {method === "card" && (
        <div className="space-y-4 bg-neutral-50 rounded-xl p-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Numéro de carte
            </label>
            <input
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="4242 4242 4242 4242"
              maxLength={19}
              className="w-full p-3 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Expiration
              </label>
              <input
                value={cardExpiry}
                onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                placeholder="MM/AA"
                maxLength={5}
                className="w-full p-3 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                CVV
              </label>
              <input
                value={cardCvv}
                onChange={(e) =>
                  setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))
                }
                placeholder="123"
                maxLength={3}
                type="password"
                className="w-full p-3 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* E-Dinar / Sobflous / D17 instructions */}
      {method !== "card" && (
        <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
          <p className="text-sm text-neutral-700 font-medium">
            {method === "edinar" &&
              "Vous serez redirigé vers la plateforme E-Dinar de La Poste Tunisienne."}
            {method === "sobflous" &&
              "Vous serez redirigé vers Sobflous pour finaliser le paiement."}
            {method === "d17" &&
              "Vous serez redirigé vers la plateforme D17 pour effectuer un virement."}
          </p>
          <p className="text-xs text-neutral-400">
            Le montant sera débité après confirmation. Votre argent est protégé
            par le système d&apos;escrow Transporti.
          </p>
        </div>
      )}

      {/* Security badges */}
      <div className="flex items-center justify-center gap-4 text-xs text-neutral-400">
        <span className="flex items-center gap-1">
          <Lock className="w-3.5 h-3.5" /> SSL 256-bit
        </span>
        <span>•</span>
        <span>Escrow protégé</span>
        <span>•</span>
        <span>Remboursement garanti</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 border border-neutral-300 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handlePay}
          disabled={
            status === "processing" ||
            (method === "card" && (!cardNumber || !cardExpiry || !cardCvv))
          }
          className="flex-1 px-4 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {status === "processing" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Traitement...
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
