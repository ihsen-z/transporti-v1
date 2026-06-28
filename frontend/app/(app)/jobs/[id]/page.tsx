"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiClient, ApiError } from "@/lib/api/client";
import type { JobDetail } from "@/lib/types/jobs";
import { JobPreview } from "@/components/jobs/JobPreview";
import { OfferForm } from "@/components/offers/OfferForm";
import { OfferList } from "@/components/offers/OfferList";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { MissionStepper } from "@/components/jobs/MissionStepper";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import {
  BadgeCheck,
  Clock,
  CheckCircle,
  ShieldAlert,
  Star,
  MapPin,
  Route,
  MessageSquare,
  Truck,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Wallet,
  FileText,
  RotateCcw,
  UserCheck,
  Package,
  XCircle,
  ArrowRight,
  Eye,
} from "lucide-react";
import Link from "next/link";

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [completing, setCompleting] = useState(false);
  const { showToast } = useToast();

  // Return trip booking state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingPrice, setBookingPrice] = useState("");
  const [bookingPayment, setBookingPayment] = useState<"DIGITAL" | "COD">(
    "DIGITAL",
  );
  const [bookingLoading, setBookingLoading] = useState(false);

  // Handle payment gateway return
  useEffect(() => {
    const paymentStatus = searchParams?.get("payment");
    if (paymentStatus === "success") {
      showToast(
        "success",
        "Paiement effectué avec succès ! Votre escrow est actif.",
      );
      // Clean URL
      router.replace(`/jobs/${jobId}`, { scroll: false });
    } else if (paymentStatus === "failed") {
      showToast(
        "error",
        "Le paiement a échoué. Veuillez réessayer depuis votre réservation.",
      );
      router.replace(`/jobs/${jobId}`, { scroll: false });
    }
  }, [searchParams]);

  const jobId = params?.id
    ? parseInt(Array.isArray(params.id) ? params.id[0] : params.id)
    : null;

  useEffect(() => {
    if (jobId) fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    try {
      const data = await apiClient.get<JobDetail>(`/api/jobs/${jobId}/`);
      setJob(data as JobDetail);
    } catch (error) {
      console.error("Error fetching job:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (
      !confirm(
        "Confirmez-vous la bonne réception de votre livraison ? Cette action libérera le paiement au transporteur.",
      )
    ) {
      return;
    }
    setConfirming(true);
    try {
      await apiClient.post("/api/payments/confirm-completion/", {
        job_id: job!.id,
      });
      showToast(
        "success",
        "Livraison confirmée ! Le paiement a été libéré au transporteur.",
      );
      fetchJob();
    } catch (error) {
      if (error instanceof ApiError && error.body) {
        showToast(
          "error",
          (error.body as any)?.error || "Erreur lors de la confirmation.",
        );
      } else {
        showToast("error", "Une erreur est survenue.");
      }
    } finally {
      setConfirming(false);
    }
  };

  const handleBookReturnTrip = async () => {
    if (!bookingPrice || parseFloat(bookingPrice) <= 0) {
      showToast("error", "Veuillez saisir un prix valide.");
      return;
    }
    setBookingLoading(true);
    try {
      await apiClient.post(`/api/jobs/${job!.id}/book-return/`, {
        proposed_price: bookingPrice,
        payment_method: bookingPayment,
      });
      showToast(
        "success",
        "🚀 Trajet retour réservé avec succès ! La mission est en cours.",
      );
      setShowBookingModal(false);
      fetchJob();
    } catch (error) {
      if (error instanceof ApiError && error.body) {
        showToast(
          "error",
          (error.body as any)?.error || "Erreur lors de la réservation.",
        );
      } else {
        showToast("error", "Une erreur est survenue.");
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelJob = async () => {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir annuler cette mission ? Cette action est irréversible.",
      )
    ) {
      return;
    }
    setCancelling(true);
    try {
      await apiClient.post(`/api/jobs/${job!.id}/cancel/`, {});
      showToast("success", "Mission annulée avec succès.");
      fetchJob();
    } catch (error) {
      if (error instanceof ApiError && error.body) {
        showToast(
          "error",
          (error.body as any)?.error || "Erreur lors de l'annulation.",
        );
      } else {
        showToast("error", "Une erreur est survenue.");
      }
    } finally {
      setCancelling(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-neutral-500">Chargement...</div>
    );
  if (!job)
    return (
      <div className="p-8 text-center text-red-500">
        Job introuvable ou accès refusé.
      </div>
    );

  const isOwner = user?.id === job.owner?.id;
  const isClient = user?.role?.toUpperCase() === "CLIENT";
  const isTransporter = user?.role?.toUpperCase() === "TRANSPORTER";
  const isVerified = user?.is_verified === true;
  const isReturnTrip = (job as any).is_return_trip === true;
  const isClientViewingReturnTrip =
    isClient && !isOwner && isReturnTrip && job.status === "PUBLISHED";
  const showOfferForm =
    isTransporter && !isOwner && job.status === "PUBLISHED" && isVerified;
  const showVerificationGate =
    isTransporter && !isOwner && job.status === "PUBLISHED" && !isVerified;
  const showOffersList =
    isOwner && (job.status === "PUBLISHED" || job.status === "IN_PROGRESS");
  const showCancelButton =
    isOwner &&
    isClient &&
    (job.status === "PUBLISHED" || job.status === "MATCHED");
  const isAssignedTransporter =
    isTransporter &&
    job.accepted_transporter?.id === user?.id;
  const showDisputeButton =
    (job.status === "IN_PROGRESS" || job.status === "COMPLETED") &&
    (isOwner || isAssignedTransporter) &&
    (!job.completed_at ||
      Date.now() - new Date(job.completed_at as string).getTime() <
        15 * 86400000);

  // Post-livraison logic
  const isCompleted = job.status === "COMPLETED";
  const clientConfirmed = job.client_confirmed === true;
  const hasReviewed = job.has_reviewed === true;
  const showConfirmButton = isCompleted && isOwner && !clientConfirmed;
  const showReviewForm =
    isCompleted && !hasReviewed && (isOwner ? clientConfirmed : true);
  const showMarkDelivered =
    job.status === "IN_PROGRESS" && isAssignedTransporter;

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Status Banner */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">
            Détail de la mission #{job.id}
          </h1>
          <StatusBadge status={job.status} />
        </div>

        {/* P1-02: Mission progress stepper */}
        <MissionStepper
          status={job.status}
          completedAt={(job as any).completed_at}
        />

        {/* P1-05: View counter (visible to job owner) */}
        {isOwner && (job as any).view_count > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 justify-end">
            <Eye className="w-3.5 h-3.5" />
            {(job as any).view_count} vue{(job as any).view_count > 1 ? "s" : ""}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content: Job Preview */}
          <div className="lg:col-span-2">
            <JobPreview data={job} isOwner={isOwner} />

            {/* Accepted Transporter Info (visible when job is assigned) */}
            {job.accepted_transporter &&
              (job.status === "IN_PROGRESS" || isCompleted) && (
                <div className="mt-6 bg-white rounded-xl shadow-sm border border-neutral-200 p-5">
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-brand-600" />
                    Transporteur assigné
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* P0-02 / P2-06: Lien profil transporteur */}
                      <Link
                        href={`/profile/${job.accepted_transporter.id}`}
                        className="w-10 h-10 rounded-full bg-brand-600/10 flex items-center justify-center text-brand-600 font-bold text-sm hover:ring-2 hover:ring-brand-300 transition-all"
                      >
                        {(job.accepted_transporter.name || "T")[0]}
                      </Link>
                      <div>
                        <Link
                          href={`/profile/${job.accepted_transporter.id}`}
                          className="text-sm font-medium text-neutral-900 hover:text-brand-600 hover:underline transition-colors"
                        >
                          {job.accepted_transporter.name}
                        </Link>
                        {job.accepted_transporter.phone && (
                          <p className="text-xs text-neutral-500">
                            📞 {job.accepted_transporter.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-neutral-900">
                        {job.accepted_transporter.total_price} TND
                      </p>
                      <p className="text-xs text-neutral-500">Prix accepté</p>
                    </div>
                  </div>
                  {/* P2-06: Quick link to profile */}
                  <Link
                    href={`/profile/${job.accepted_transporter.id}`}
                    className="mt-3 w-full py-2 text-sm text-brand-600 border border-brand-600/20 rounded-lg font-medium hover:bg-brand-600/5 transition-colors flex items-center justify-center gap-1.5"
                  >
                    Voir le profil complet
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
          </div>

          {/* Sidebar: Actions */}
          <div className="space-y-6">
            {/* Verification Gate */}
            {showVerificationGate && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-800">
                    Vérification requise
                  </h3>
                </div>
                <p className="text-sm text-amber-700 mb-3">
                  Vous devez compléter votre vérification avant de soumettre des
                  offres.
                </p>
                <Link
                  href="/verification"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Compléter ma vérification
                </Link>
              </div>
            )}

            {/* Transporter Actions */}
            {showOfferForm && (
              <OfferForm
                jobId={job.id}
                jobType={job.job_type}
                priceTndMin={(job as any).price_tnd_min}
                priceTndMax={(job as any).price_tnd_max}
                onOfferSubmitted={() => {
                  showToast("success", "Offre envoyée avec succès !");
                  fetchJob();
                }}
              />
            )}

            {/* Client Info Card (for transporters) */}
            {isTransporter && job.owner && (
              <Link
                href={`/profile/${job.owner.id}`}
                className="block bg-white rounded-xl shadow-sm p-4 border border-neutral-200 hover:border-brand-300 hover:shadow-md transition-all group"
              >
                <h3 className="text-sm font-semibold text-neutral-700 mb-3">
                  Client
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-600/10 flex items-center justify-center text-brand-600 font-bold text-sm">
                    {(job.owner.first_name || job.owner.name?.[0] || "C")[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900 group-hover:text-brand-600 transition-colors">
                      {job.owner.name ||
                        `${job.owner.first_name || "Client"} ${(job.owner.last_name || "")[0]}.`}
                    </p>
                    {job.owner.rating && (
                      <div className="flex items-center gap-1 text-xs text-neutral-500">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {job.owner.rating.toFixed(1)} ·{" "}
                        {job.owner.review_count || 0} avis
                      </div>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-brand-500 transition-colors" />
                </div>
              </Link>
            )}

            {/* Route Estimation */}
            {job.pickup_governorate && job.dropoff_governorate && (
              <div className="bg-white rounded-xl shadow-sm p-4 border border-neutral-200">
                <h3 className="text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-2">
                  <Route className="w-4 h-4 text-brand-600" />
                  Estimation trajet
                </h3>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-neutral-600">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    {job.pickup_governorate}
                  </div>
                  <span className="text-neutral-400">→</span>
                  <div className="flex items-center gap-1 text-neutral-600">
                    <MapPin className="w-3.5 h-3.5 text-green-500" />
                    {job.dropoff_governorate}
                  </div>
                </div>
              </div>
            )}

            {/* Client Actions: Offers List */}
            {showOffersList && (
              <div className="bg-white rounded-xl shadow-sm p-4 border">
                <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-purple-600" />
                  Offres reçues
                </h3>
                <OfferList
                  jobId={job.id}
                  isJobOwner={isOwner}
                  onOfferAccepted={fetchJob}
                />
              </div>
            )}

            {/* Return Trip CTA for Clients */}
            {isClientViewingReturnTrip && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-purple-900">
                      Trajet retour disponible
                    </h3>
                    <p className="text-xs text-purple-600">
                      Tarif réduit — camion sur le retour
                    </p>
                  </div>
                </div>

                {/* Transporter Info */}
                <div className="bg-white rounded-lg p-3 mb-3 border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600/10 flex items-center justify-center text-purple-600 font-bold text-sm">
                      {(job.owner?.name || job.owner?.first_name || "T")[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {job.owner?.name ||
                          `${job.owner?.first_name || "Transporteur"}`}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-neutral-500">
                        <UserCheck className="w-3 h-3 text-green-500" />
                        Transporteur vérifié
                      </div>
                    </div>
                  </div>
                </div>

                {/* Capacity Info */}
                {(job as any).available_capacity && (
                  <div className="flex items-center gap-2 text-sm text-purple-700 mb-3">
                    <Package className="w-4 h-4" />
                    <span>Capacité : {(job as any).available_capacity}</span>
                  </div>
                )}

                {/* Price */}
                {(job.price_tnd_min || job.price_tnd_max) && (
                  <div className="text-center bg-white rounded-lg py-2 px-3 mb-3 border border-purple-100">
                    <p className="text-xs text-neutral-500">Prix indicatif</p>
                    <p className="text-xl font-bold text-purple-700">
                      {String(job.price_tnd_min || "0")} -{" "}
                      {String(job.price_tnd_max || "?")} TND
                    </p>
                  </div>
                )}

                {/* Primary CTA — Réserver */}
                <button
                  onClick={() => {
                    setBookingPrice(String(job.price_tnd_min || ""));
                    setBookingPayment("DIGITAL");
                    setShowBookingModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20 mb-2"
                >
                  <Truck className="w-5 h-5" />
                  Réserver ce trajet
                </button>

                {/* Secondary CTA — Contacter */}
                <Link
                  href={`/messages?contact=${job.owner?.id}&subject=Trajet retour #${job.id}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-purple-300 text-purple-700 rounded-xl font-medium hover:bg-purple-50 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Contacter le transporteur
                </Link>
                <p className="text-xs text-purple-500 text-center mt-2 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Paiement sécurisé par escrow
                </p>
              </div>
            )}

            {/* Booking Confirmation Modal */}
            {showBookingModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fade-in-up">
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                        <RotateCcw className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          Confirmer la réservation
                        </h3>
                        <p className="text-sm text-purple-200">
                          Trajet retour #{job.id}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Modal Body */}
                  <div className="px-6 py-5 space-y-4">
                    {/* Route summary */}
                    <div className="bg-neutral-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex flex-col items-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                          <div className="w-0.5 h-5 bg-neutral-300 my-0.5" />
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        </div>
                        <div className="space-y-2">
                          <p className="font-medium text-neutral-900">
                            {job.pickup_address}
                          </p>
                          <p className="font-medium text-neutral-900">
                            {job.dropoff_address}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Price input (negotiable) */}
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                        Votre prix proposé (TND)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={bookingPrice}
                          onChange={(e) => setBookingPrice(e.target.value)}
                          className="w-full border-2 border-neutral-200 rounded-xl px-4 py-3 text-lg font-bold text-center focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                          placeholder="Ex: 100"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-400">
                          TND
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Prix indicatif du transporteur :{" "}
                        {String(job.price_tnd_min || "—")} TND
                      </p>
                    </div>

                    {/* Payment method */}
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                        Mode de paiement
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setBookingPayment("DIGITAL")}
                          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                            bookingPayment === "DIGITAL"
                              ? "border-purple-500 bg-purple-50 text-purple-700"
                              : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                          }`}
                        >
                          <CreditCard className="w-4 h-4" />
                          Paiement sécurisé
                        </button>
                        <button
                          type="button"
                          onClick={() => setBookingPayment("COD")}
                          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                            bookingPayment === "COD"
                              ? "border-purple-500 bg-purple-50 text-purple-700"
                              : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                          }`}
                        >
                          <Wallet className="w-4 h-4" />À la livraison
                        </button>
                      </div>
                      {bookingPayment === "COD" &&
                        parseFloat(bookingPrice) > 300 && (
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Maximum 300 TND pour le paiement à la livraison
                          </p>
                        )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex gap-3">
                    <button
                      onClick={() => setShowBookingModal(false)}
                      disabled={bookingLoading}
                      className="flex-1 py-3 border-2 border-neutral-200 text-neutral-700 rounded-xl font-medium hover:bg-neutral-100 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleBookReturnTrip}
                      disabled={
                        bookingLoading ||
                        !bookingPrice ||
                        parseFloat(bookingPrice) <= 0 ||
                        (bookingPayment === "COD" &&
                          parseFloat(bookingPrice) > 300)
                      }
                      className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {bookingLoading ? (
                        <span className="flex items-center gap-2">
                          <svg
                            className="animate-spin h-4 w-4"
                            viewBox="0 0 24 24"
                          >
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
                          Réservation...
                        </span>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Confirmer
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Trust & Security Banner */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                Confiance & Sécurité
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-xs text-neutral-600">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Transporteurs vérifiés (CIN, patente, assurance)</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-neutral-600">
                  <Wallet className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 mt-0.5" />
                  <span>
                    Paiement sécurisé par escrow — libéré après confirmation
                  </span>
                </li>
                <li className="flex items-start gap-2 text-xs text-neutral-600">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>Résolution de litiges sous 24-48h</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-neutral-600">
                  <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Avis authentiques de clients vérifiés</span>
                </li>
              </ul>
            </div>

            {/* In Progress Status */}
            {job.status === "IN_PROGRESS" && (
              <div className="bg-brand-600/5 border border-brand-600/20 rounded-xl p-4 text-brand-700">
                <h3 className="font-bold flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5" />
                  Mission en cours
                </h3>
                <p className="text-sm">
                  {isAssignedTransporter
                    ? "Vous êtes assigné à cette mission. Marquez-la comme livrée une fois terminée."
                    : "Le transporteur a été assigné. Coordonnez-vous via la messagerie."}
                </p>
                <div className="mt-3 space-y-2">
                  {/* P0-01: CTA "Marquer comme livré" — Transporteur uniquement */}
                  {showMarkDelivered && (
                    <button
                      onClick={async () => {
                        if (
                          !window.confirm(
                            "Confirmez-vous avoir livré la marchandise ? Le client sera notifié pour confirmer la réception.",
                          )
                        )
                          return;
                        setCompleting(true);
                        try {
                          await apiClient.post(
                            `/api/jobs/${job.id}/complete/`,
                          );
                          showToast(
                            "success",
                            "Mission marquée comme terminée ! Le client va confirmer la réception.",
                          );
                          fetchJob();
                        } catch (err) {
                          if (err instanceof ApiError && err.body) {
                            const msg =
                              (err.body as any).error ||
                              "Erreur lors de la confirmation.";
                            showToast("error", String(msg));
                          } else {
                            showToast(
                              "error",
                              "Erreur réseau. Veuillez réessayer.",
                            );
                          }
                        } finally {
                          setCompleting(false);
                        }
                      }}
                      disabled={completing}
                      className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 hover:shadow-md hover:shadow-emerald-600/20"
                    >
                      {completing ? (
                        <Clock className="w-4 h-4 animate-spin" />
                      ) : (
                        <Package className="w-4 h-4" />
                      )}
                      {completing
                        ? "Confirmation..."
                        : "📦 Marquer comme livré"}
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/messages/${job.id}`)}
                    className="w-full py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Ouvrir la messagerie
                  </button>
                  <Link
                    href={`/booking/${job.id}`}
                    className="w-full py-2 border border-brand-600/30 text-brand-700 rounded-lg font-medium hover:bg-brand-600/5 flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Voir la réservation
                  </Link>
                  {/* P2-03: Cancel mutuel — transporteur peut annuler */}
                  {isAssignedTransporter && (
                    <button
                      onClick={async () => {
                        const reason = window.prompt(
                          "Raison de l'annulation (obligatoire) :",
                        );
                        if (!reason || !reason.trim()) return;
                        if (
                          !window.confirm(
                            "Êtes-vous sûr de vouloir annuler cette mission ? La mission sera remise en ligne.",
                          )
                        )
                          return;
                        try {
                          await apiClient.post(
                            `/api/jobs/${job.id}/transporter-cancel/`,
                            { reason: reason.trim() },
                          );
                          showToast(
                            "success",
                            "Mission annulée. Le client a été notifié.",
                          );
                          fetchJob();
                        } catch (err) {
                          if (err instanceof ApiError && err.body) {
                            showToast(
                              "error",
                              String(
                                (err.body as any).error || "Erreur inattendue.",
                              ),
                            );
                          } else {
                            showToast("error", "Erreur réseau.");
                          }
                        }
                      }}
                      className="w-full py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 flex items-center justify-center gap-2 text-sm transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Annuler la mission
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ============================================ */}
            {/* POST-LIVRAISON FLOW (BL-03, UX-01)          */}
            {/* ============================================ */}

            {isCompleted && (
              <div className="space-y-4">
                {/* Step 1: CLIENT CONFIRMATION */}
                {showConfirmButton && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 animate-fade-in-up">
                    <h3 className="font-bold flex items-center gap-2 mb-2 text-amber-900">
                      <AlertCircle className="w-5 h-5" />
                      Confirmer la livraison
                    </h3>
                    <p className="text-sm text-amber-800 mb-4">
                      Le transporteur a marqué cette mission comme terminée.
                      Confirmez la bonne réception pour libérer le paiement.
                    </p>
                    <button
                      onClick={handleConfirmDelivery}
                      disabled={confirming}
                      className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {confirming ? (
                        "Confirmation..."
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          Confirmer la réception & Libérer le paiement
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Confirmed badge (after confirmation) */}
                {clientConfirmed && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <ShieldCheck className="w-5 h-5" />
                      <span className="font-semibold">
                        Livraison confirmée — Paiement libéré ✓
                      </span>
                    </div>
                  </div>
                )}

                {/* Transporter waiting for confirmation */}
                {!clientConfirmed && isTransporter && (
                  <div className="bg-brand-600/5 border border-brand-600/20 rounded-xl p-4 text-brand-700">
                    <h3 className="font-bold flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5" />
                      En attente de confirmation
                    </h3>
                    <p className="text-sm">
                      Le client doit confirmer la bonne réception avant que
                      votre paiement soit libéré.
                    </p>
                  </div>
                )}

                {/* Step 2: REVIEW (after confirmation for client, immediate for transporter) */}
                {showReviewForm && (
                  <div className="animate-fade-in-up">
                    <ReviewForm
                      jobId={job.id}
                      onReviewSubmitted={() => {
                        fetchJob();
                      }}
                    />
                  </div>
                )}

                {/* Already reviewed */}
                {hasReviewed && (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex items-center gap-2 text-neutral-600">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm">
                      Vous avez déjà laissé un avis pour cette mission.
                    </span>
                  </div>
                )}

                {/* Mission completed summary */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800">
                  <h3 className="font-bold flex items-center gap-2 mb-1">
                    <CheckCircle className="w-5 h-5" />
                    Mission terminée
                  </h3>
                  <p className="text-sm">
                    Le transport a été effectué avec succès.
                  </p>
                </div>
              </div>
            )}

            {/* Cancel Button — visible on PUBLISHED/MATCHED for client owner */}
            {showCancelButton && (
              <button
                onClick={handleCancelJob}
                disabled={cancelling}
                className="flex items-center justify-center gap-2 w-full py-3 border border-neutral-300 bg-white text-neutral-700 rounded-xl text-sm font-semibold hover:bg-neutral-50 hover:border-neutral-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? (
                  "Annulation..."
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Annuler cette mission
                  </>
                )}
              </button>
            )}

            {/* Dispute Button — visible on IN_PROGRESS or COMPLETED */}
            {showDisputeButton && (
              <Link
                href={`/disputes?job=${job.id}`}
                className="flex items-center justify-center gap-2 w-full py-3 border border-red-200 bg-red-50 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                Signaler un problème
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
