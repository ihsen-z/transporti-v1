"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  createBooking,
  getJobOffer,
  getReservedJob,
} from "@/lib/services/bookings";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { formatTND, formatDate } from "@/lib/format";
import { BookingSummary } from "@/components/booking/BookingSummary";
import { PaymentMethodSelector } from "@/components/booking/PaymentMethodSelector";
import { PaymentGateway } from "@/components/booking/PaymentGateway";
import { EscrowBadge } from "@/components/booking/EscrowBadge";
import LoadingState from "@/components/ui/LoadingState";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  PartyPopper,
  MessageSquare,
} from "lucide-react";
import { urlJob } from "@/lib/routes/jobs";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface JobData {
  id: number;
  job_type: "TRANSPORT" | "MOVING";
  /** Nature du job — construit l'URL canonique du lien de retour. */
  is_return_trip?: boolean;
  pickup_address: string;
  dropoff_address: string;
  scheduled_time: string;
  specifications?: { weight_kg?: number; fragile?: boolean };
}

interface OfferData {
  id: number;
  total_price: number;
  commission_rate: number;
  transporter_name: string;
  transporter_rating: number;
  trust_badge: string;
  message?: string;
}

/* -------------------------------------------------------------------------- */
/*  Booking Page                                                              */
/* -------------------------------------------------------------------------- */

type BookingStep = "review" | "payment" | "confirm" | "success";

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { t } = useAppI18n();

  const jobId = Number(params.id);
  const offerId = searchParams.get("offer")
    ? Number(searchParams.get("offer"))
    : undefined;

  const [step, setStep] = useState<BookingStep>("review");
  const [paymentMethod, setPaymentMethod] = useState<"DIGITAL" | "COD">(
    "DIGITAL",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGateway, setShowGateway] = useState(false);
  const [job, setJob] = useState<JobData | null>(null);
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Fetch job and offer data from API
  useEffect(() => {
    async function fetchData() {
      try {
        setErreur(null);
        setJob(await getReservedJob(jobId));

        if (offerId) {
          // La lecture de l'offre, et la raison pour laquelle elle passe par
          // la LISTE et non par une route de detail, vivent dans le service.
          const trouvee = await getJobOffer<OfferData>(jobId, offerId);
          // DRF serialise les decimaux en CHAINE ("95.00"). Le type OfferData
          // annonce `number` : la difference n'avait jamais ete exercee, cet
          // ecran ne chargeant jamais. Des qu'il a charge, `totalPrice
          // .toFixed(2)` d'EscrowBadge a fait tomber la page sur sa frontiere
          // d'erreur. On normalise ici, une fois, plutot que de defendre
          // chaque composant consommateur.
          setOffer({
            ...trouvee,
            total_price: Number(trouvee.total_price),
            commission_rate: Number(trouvee.commission_rate),
            transporter_rating: Number(trouvee.transporter_rating),
          });
        }
      } catch (err) {
        // Remonter la cause plutot que de la masquer : un ecran de paiement
        // vide sans explication est indistinguable d'une reservation
        // inexistante.
        console.error("Failed to fetch booking data:", err);
        setErreur(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [jobId, offerId]);

  async function handleConfirmBooking() {
    setIsSubmitting(true);
    try {
      await createBooking(jobId, offerId, paymentMethod);
      setStep("success");
    } catch (error) {
      console.error("Booking failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <LoadingState variant="page" />
      </div>
    );
  }

  if (!job || !offer) {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto text-center">
        <p className="text-neutral-500">{t.bookingPage.notFound}</p>
        {erreur && <p className="mt-2 text-xs text-neutral-400">{erreur}</p>}
        <button
          onClick={() => router.back()}
          className="mt-4 text-brand-600 hover:underline"
        >
          {t.bookingPage.back}
        </button>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="bg-surface rounded-card shadow-card p-12 text-center">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
            <PartyPopper className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-[21px] font-extrabold tracking-heading text-ink-900 mb-2">
            {t.bookingPage.successTitle}
          </h2>
          <p className="text-neutral-500 mb-8 max-w-md mx-auto">
            {t.bookingPage.successDesc}
          </p>

          <div className="bg-neutral-50 rounded-xl p-4 mb-8 text-start flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">
                {t.bookingPage.orderNumber}
              </span>
              <span className="font-mono font-medium text-neutral-900">
                TRN-{job.id.toString().padStart(6, "0")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">
                {t.bookingPage.paymentMethod}
              </span>
              <span className="font-medium text-neutral-900">
                {paymentMethod === "DIGITAL"
                  ? t.bookingPage.paymentDigital
                  : t.bookingPage.paymentCOD}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">
                {t.bookingPage.totalAmount}
              </span>
              <span className="font-semibold text-brand-600">
                {formatTND(offer.total_price)}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/messages/${job.id}`}
              className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              {t.bookingPage.contactTransporter}
            </Link>
            <Link
              href={urlJob(job.id, job.is_return_trip)}
              className="inline-flex items-center justify-center gap-2 bg-neutral-100 text-neutral-700 px-6 py-3 rounded-xl font-semibold hover:bg-neutral-200 transition-colors"
            >
              {t.bookingPage.trackMission}
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-neutral-100 text-neutral-700 px-6 py-3 rounded-xl font-semibold hover:bg-neutral-200 transition-colors"
            >
              {t.bookingPage.backToDashboard}
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
          <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" />
          {t.bookingPage.back}
        </button>
        <h2 className="text-[21px] font-extrabold tracking-heading text-ink-900">
          {t.bookingPage.finalizeTitle}
        </h2>
        <p className="text-neutral-500 mt-1">
          {t.bookingPage.finalizeSubtitle}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {(["review", "payment", "confirm"] as BookingStep[]).map((s, i) => {
          const labels = [
            t.bookingPage.stepReview,
            t.bookingPage.stepPayment,
            t.bookingPage.stepConfirm,
          ];
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
                                    ${isDone ? "bg-brand-600 text-white" : isActive ? "bg-blue-50 text-blue-700 ring-2 ring-primary-500" : "bg-neutral-100 text-neutral-400"}`}
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
        <div className="lg:col-span-3 flex flex-col gap-6">
          {step === "review" && (
            <>
              <BookingSummary job={job} offer={offer} />
              {offer.message && (
                <div className="bg-surface rounded-card shadow-card p-6">
                  <h3 className="text-[14px] font-bold text-ink-900 mb-2">
                    {t.bookingPage.transporterMessage}
                  </h3>
                  <p className="text-sm text-neutral-600 italic">
                    &laquo;&nbsp;{offer.message}&nbsp;&raquo;
                  </p>
                </div>
              )}
              <button
                data-testid="reservation-continuer-paiement"
                onClick={() => setStep("payment")}
                className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-semibold hover:bg-brand-700 transition-colors shadow-lg shadow-primary-600/20"
              >
                {t.bookingPage.continueToPayment}
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
                <div className="bg-surface rounded-card shadow-card p-6">
                  <PaymentGateway
                    amount={offer.total_price}
                    jobId={jobId}
                    onCancel={() => setShowGateway(false)}
                  />
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("review")}
                    className="flex-1 bg-neutral-100 text-neutral-700 py-3.5 rounded-xl font-semibold hover:bg-neutral-200 transition-colors"
                  >
                    {t.bookingPage.back}
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
                      ? t.bookingPage.proceedToPayment
                      : t.bookingPage.verifyAndConfirm}
                  </button>
                </div>
              )}
            </>
          )}

          {step === "confirm" && (
            <>
              <div className="bg-surface rounded-card shadow-card p-6">
                <h3 className="text-[17px] font-extrabold tracking-heading text-ink-900 mb-4">
                  {t.bookingPage.finalConfirmation}
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between text-sm py-2 border-b border-neutral-50">
                    <span className="text-neutral-500">
                      {t.bookingPage.route}
                    </span>
                    <span className="text-neutral-900 font-medium text-end max-w-[60%]">
                      {job.pickup_address} → {job.dropoff_address}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-neutral-50">
                    <span className="text-neutral-500">
                      {t.bookingPage.transporter}
                    </span>
                    <span className="text-neutral-900 font-medium">
                      {offer.transporter_name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-neutral-50">
                    <span className="text-neutral-500">
                      {t.bookingPage.paymentMethod}
                    </span>
                    <span className="text-neutral-900 font-medium">
                      {paymentMethod === "DIGITAL"
                        ? t.bookingPage.paymentDigital
                        : t.bookingPage.paymentCOD}
                    </span>
                  </div>
                  <div className="flex justify-between text-base py-2 font-bold">
                    <span className="text-neutral-900">
                      {t.bookingPage.total}
                    </span>
                    <span className="text-brand-600">
                      {formatTND(offer.total_price)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-warning-50 rounded-tile p-4 text-sm text-warning-800">
                {t.bookingPage.termsPre}
                <a href="#" className="underline font-medium">
                  {t.bookingPage.termsLink}
                </a>
                {t.bookingPage.termsPost}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("payment")}
                  className="flex-1 bg-neutral-100 text-neutral-700 py-3.5 rounded-xl font-semibold hover:bg-neutral-200 transition-colors"
                >
                  {t.bookingPage.back}
                </button>
                <button
                  onClick={handleConfirmBooking}
                  disabled={isSubmitting}
                  className="flex-[2] bg-green-600 text-white py-3.5 rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t.bookingPage.processing}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      {t.bookingPage.confirmBooking}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Sidebar - Always Visible Summary */}
        <div className="lg:col-span-2 space-y-4 hidden lg:block">
          <div className="bg-surface rounded-card shadow-card p-6 sticky top-24">
            <h3 className="text-[14px] font-bold text-ink-900 mb-4">
              {t.bookingPage.yourOrder}
            </h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">{t.bookingPage.type}</span>
                <span className="font-medium text-neutral-900">
                  {job.job_type === "TRANSPORT"
                    ? t.bookingPage.typeTransport
                    : t.bookingPage.typeMoving}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">
                  {t.bookingPage.transporter}
                </span>
                <span className="font-medium text-neutral-900">
                  {offer.transporter_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{t.bookingPage.date}</span>
                <span className="font-medium text-neutral-900">
                  {formatDate(job.scheduled_time, undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <hr className="border-neutral-100" />
              <div className="flex justify-between text-base font-bold">
                <span className="text-neutral-900">{t.bookingPage.total}</span>
                <span className="text-brand-600">
                  {formatTND(offer.total_price)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
