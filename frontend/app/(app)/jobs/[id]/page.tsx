"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiClient, ApiError } from "@/lib/api/client";
import { JobPreview } from "@/components/jobs/JobPreview";
import { OfferForm } from "@/components/offers/OfferForm";
import { OfferList } from "@/components/offers/OfferList";
import { ReviewForm } from "@/components/reviews/ReviewForm";
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
} from "lucide-react";
import Link from "next/link";

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const { showToast } = useToast();

  const jobId = params?.id
    ? parseInt(Array.isArray(params.id) ? params.id[0] : params.id)
    : null;

  useEffect(() => {
    if (jobId) fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    try {
      const data = await apiClient.get(`/api/jobs/${jobId}/`);
      setJob(data);
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
        job_id: job.id,
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
  const isTransporter = user?.role === "transporter";
  const isVerified = user?.is_verified !== false;
  const showOfferForm =
    isTransporter && !isOwner && job.status === "PUBLISHED" && isVerified;
  const showVerificationGate =
    isTransporter && !isOwner && job.status === "PUBLISHED" && !isVerified;
  const showOffersList =
    isOwner && (job.status === "PUBLISHED" || job.status === "IN_PROGRESS");

  // Post-livraison logic
  const isCompleted = job.status === "COMPLETED";
  const clientConfirmed = job.client_confirmed === true;
  const hasReviewed = job.has_reviewed === true;
  const showConfirmButton = isCompleted && isOwner && !clientConfirmed;
  const showReviewForm =
    isCompleted && !hasReviewed && (isOwner ? clientConfirmed : true);

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
                      <div className="w-10 h-10 rounded-full bg-brand-600/10 flex items-center justify-center text-brand-600 font-bold text-sm">
                        {(job.accepted_transporter.name || "T")[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {job.accepted_transporter.name}
                        </p>
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
                onOfferSubmitted={() => {
                  showToast("success", "Offre envoyée avec succès !");
                  fetchJob();
                }}
              />
            )}

            {/* Client Info Card (for transporters) */}
            {isTransporter && job.owner && (
              <div className="bg-white rounded-xl shadow-sm p-4 border border-neutral-200">
                <h3 className="text-sm font-semibold text-neutral-700 mb-3">
                  Client
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-600/10 flex items-center justify-center text-brand-600 font-bold text-sm">
                    {(job.owner.first_name || job.owner.name?.[0] || "C")[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
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
                </div>
              </div>
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
                <OfferList jobId={job.id} isJobOwner={isOwner} />
              </div>
            )}

            {/* In Progress Status */}
            {job.status === "IN_PROGRESS" && (
              <div className="bg-brand-600/5 border border-brand-600/20 rounded-xl p-4 text-brand-700">
                <h3 className="font-bold flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5" />
                  Mission en cours
                </h3>
                <p className="text-sm">
                  Le transporteur a été assigné. Coordonnez-vous via la
                  messagerie.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => router.push(`/messages/${job.id}`)}
                    className="w-full py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Ouvrir la messagerie
                  </button>
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
          </div>
        </div>
      </div>
    </div>
  );
}

/* Status Badge */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    DRAFT: { bg: "bg-neutral-100 text-neutral-700", label: "Brouillon" },
    PUBLISHED: { bg: "bg-green-100 text-green-800", label: "Publiée" },
    MATCHED: { bg: "bg-purple-100 text-purple-800", label: "Attribuée" },
    IN_PROGRESS: { bg: "bg-brand-600/10 text-brand-700", label: "En cours" },
    COMPLETED: { bg: "bg-emerald-100 text-emerald-800", label: "Terminée" },
    CANCELLED: { bg: "bg-red-100 text-red-700", label: "Annulée" },
    DISPUTED: { bg: "bg-orange-100 text-orange-800", label: "Litige" },
  };
  const c = config[status] || {
    bg: "bg-neutral-100 text-neutral-600",
    label: status,
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${c.bg}`}>
      {c.label}
    </span>
  );
}
