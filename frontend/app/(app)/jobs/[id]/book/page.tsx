"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { PaymentMethodSelector } from "@/components/booking/PaymentMethodSelector";
import { PaymentGateway } from "@/components/booking/PaymentGateway";
import { EscrowBadge } from "@/components/booking/EscrowBadge";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  PartyPopper,
  MessageSquare,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Mock Data (until booking API wired)                                       */
/* -------------------------------------------------------------------------- */

const MOCK_JOB = {
  id: 1,
  job_type: "TRANSPORT" as const,
  pickup_address: "Tunis — La Marsa, Rue du Lac",
  dropoff_address: "Sousse Centre, Avenue Habib Bourguiba",
  scheduled_time: "2026-02-12T10:00:00Z",
  specifications: { weight_kg: 120, fragile: true },
};

const MOCK_OFFER = {
  id: 5,
  total_price: 250,
  commission_rate: 0.15,
  transporter_name: "Mohamed Trabelsi",
  transporter_rating: 4.6,
  trust_badge: "VERIFIED",
  message:
    "Je peux transporter votre colis le jour même. Véhicule disponible immédiatement.",
};

/* -------------------------------------------------------------------------- */
/*  Booking Page                                                              */
/* -------------------------------------------------------------------------- */

type BookingStep = "review" | "payment" | "confirm" | "success";

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<BookingStep>("review");
  const [paymentMethod, setPaymentMethod] = useState<"DIGITAL" | "COD">(
    "DIGITAL",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGateway, setShowGateway] = useState(false);

  // In production, fetch the job + accepted offer from the API
  const job = MOCK_JOB;
  const offer = MOCK_OFFER;

  async function handleConfirmBooking() {
    setIsSubmitting(true);
    try {
      // POST to /api/bookings/ with { job_id, offer_id, payment_method }
      // For now, simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setStep("success");
    } catch (error) {
      console.error("Booking failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "success") {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <PartyPopper className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            Réservation confirmée !
          </h1>
          <p className="text-neutral-500 mb-8 max-w-md mx-auto">
            Votre transporteur a été notifié. Vous pouvez suivre l'avancement de
            votre mission depuis votre tableau de bord.
          </p>

          <div className="bg-neutral-50 rounded-xl p-4 mb-8 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Numéro de commande</span>
              <span className="font-mono font-medium text-neutral-900">
                TRN-{job.id.toString().padStart(6, "0")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Mode de paiement</span>
              <span className="font-medium text-neutral-900">
                {paymentMethod === "DIGITAL"
                  ? "Paiement digital (Escrow)"
                  : "Paiement à la livraison"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Montant total</span>
              <span className="font-semibold text-brand-600">
                {offer.total_price.toFixed(2)} TND
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/messages/${job.id}`}
              className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              Contacter le transporteur
            </Link>
            <Link
              href={`/jobs/${job.id}`}
              className="inline-flex items-center justify-center gap-2 bg-neutral-100 text-neutral-700 px-6 py-3 rounded-xl font-semibold hover:bg-neutral-200 transition-colors"
            >
              Suivre la mission
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-neutral-100 text-neutral-700 px-6 py-3 rounded-xl font-semibold hover:bg-neutral-200 transition-colors"
            >
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <h1 className="text-2xl font-bold text-neutral-900">
          Finaliser la réservation
        </h1>
        <p className="text-neutral-500 mt-1">
          Vérifiez les détails et choisissez votre mode de paiement.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {(["review", "payment", "confirm"] as BookingStep[]).map((s, i) => {
          const labels = ["Récapitulatif", "Paiement", "Confirmation"];
          const isActive = step === s;
          const isDone = ["review", "payment", "confirm"].indexOf(step) > i;
          return (
            <React.Fragment key={s}>
              {i > 0 && (
                <div
                  className={`flex-1 h-0.5 ${isDone ? "bg-brand-600" : "bg-neutral-200"}`}
                />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                                    ${isDone ? "bg-brand-600 text-white" : isActive ? "bg-brand-600/10 text-brand-600 ring-2 ring-primary-500" : "bg-neutral-100 text-neutral-400"}`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:block ${isActive ? "text-neutral-900" : "text-neutral-400"}`}
                >
                  {labels[i]}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {step === "review" && (
            <>
              <BookingSummary job={job} offer={offer} />
              {offer.message && (
                <div className="bg-white rounded-2xl border border-neutral-100 p-6">
                  <h3 className="text-sm font-semibold text-neutral-900 mb-2">
                    Message du transporteur
                  </h3>
                  <p className="text-sm text-neutral-600 italic">
                    "{offer.message}"
                  </p>
                </div>
              )}
              <button
                onClick={() => setStep("payment")}
                className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-semibold hover:bg-brand-700 transition-colors shadow-lg shadow-primary-600/20"
              >
                Continuer vers le paiement
              </button>
            </>
          )}

          {step === "payment" && (
            <>
              <PaymentMethodSelector
                selected={paymentMethod}
                onSelect={(m) => {
                  setPaymentMethod(m);
                  setShowGateway(false);
                }}
                totalPrice={offer.total_price}
              />
              <EscrowBadge
                paymentMethod={paymentMethod}
                totalPrice={offer.total_price}
              />

              {/* Payment Gateway for digital payments */}
              {paymentMethod === "DIGITAL" && showGateway ? (
                <div className="bg-white rounded-2xl border border-neutral-100 p-6">
                  <PaymentGateway
                    amount={offer.total_price}
                    onSuccess={(txnId) => {
                      console.log("Payment success:", txnId);
                      setStep("success");
                    }}
                    onCancel={() => setShowGateway(false)}
                  />
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("review")}
                    className="flex-1 bg-neutral-100 text-neutral-700 py-3.5 rounded-xl font-semibold hover:bg-neutral-200 transition-colors"
                  >
                    Retour
                  </button>
                  <button
                    onClick={() => {
                      if (paymentMethod === "DIGITAL") {
                        setShowGateway(true);
                      } else {
                        setStep("confirm");
                      }
                    }}
                    className="flex-[2] bg-brand-600 text-white py-3.5 rounded-xl font-semibold hover:bg-brand-700 transition-colors shadow-lg shadow-primary-600/20"
                  >
                    {paymentMethod === "DIGITAL"
                      ? "Procéder au paiement"
                      : "Vérifier et confirmer"}
                  </button>
                </div>
              )}
            </>
          )}

          {step === "confirm" && (
            <>
              <div className="bg-white rounded-2xl border border-neutral-100 p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                  Confirmation finale
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm py-2 border-b border-neutral-50">
                    <span className="text-neutral-500">Trajet</span>
                    <span className="text-neutral-900 font-medium text-right max-w-[60%]">
                      {job.pickup_address} → {job.dropoff_address}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-neutral-50">
                    <span className="text-neutral-500">Transporteur</span>
                    <span className="text-neutral-900 font-medium">
                      {offer.transporter_name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-neutral-50">
                    <span className="text-neutral-500">Mode de paiement</span>
                    <span className="text-neutral-900 font-medium">
                      {paymentMethod === "DIGITAL"
                        ? "Paiement digital (Escrow)"
                        : "Paiement à la livraison"}
                    </span>
                  </div>
                  <div className="flex justify-between text-base py-2 font-bold">
                    <span className="text-neutral-900">Total</span>
                    <span className="text-brand-600">
                      {offer.total_price.toFixed(2)} TND
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                En confirmant cette réservation, vous acceptez les{" "}
                <a href="#" className="underline font-medium">
                  conditions générales
                </a>{" "}
                de Transporti.
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("payment")}
                  className="flex-1 bg-neutral-100 text-neutral-700 py-3.5 rounded-xl font-semibold hover:bg-neutral-200 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleConfirmBooking}
                  disabled={isSubmitting}
                  className="flex-[2] bg-emerald-600 text-white py-3.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Confirmer la réservation
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Sidebar - Always Visible Summary */}
        <div className="lg:col-span-2 space-y-4 hidden lg:block">
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 sticky top-24">
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">
              Votre commande
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Type</span>
                <span className="font-medium text-neutral-900">
                  {job.job_type === "TRANSPORT" ? "Transport" : "Déménagement"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Transporteur</span>
                <span className="font-medium text-neutral-900">
                  {offer.transporter_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Date</span>
                <span className="font-medium text-neutral-900">
                  {new Date(job.scheduled_time).toLocaleDateString("fr-TN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <hr className="border-neutral-100" />
              <div className="flex justify-between text-base font-bold">
                <span className="text-neutral-900">Total</span>
                <span className="text-brand-600">
                  {offer.total_price.toFixed(2)} TND
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
