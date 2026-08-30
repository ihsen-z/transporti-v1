"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiClient, ApiError } from "@/lib/api/client";
import type { JobDetail } from "@/lib/types/jobs";
import { useJobDetail } from "@/hooks/useJobDetail";
import { TripRequestDialog } from "@/components/jobs/TripRequestDialog";
import { JobDetailDialogs } from "@/components/jobs/JobDetailDialogs";
import { ReturnTripClientPanel } from "@/components/jobs/ReturnTripClientPanel";
import { MissionInProgressPanel } from "@/components/jobs/MissionInProgressPanel";
import { MissionMatchedPanel } from "@/components/jobs/MissionMatchedPanel";
import {
  accepterContreProposition,
  annulerDemandeSurTrajet,
  annulerParLeClient,
  annulerParLeTransporteur,
  confirmerDemarrage,
  confirmerLivraisonParLeClient,
  enregistrerJalon,
  envoyerDemandeSurTrajet,
  getJobDetail,
  initierPaiement,
  marquerLivre,
  reserverTrajetRetour,
  televerserPhotoPreuve,
  verifierPaiement,
} from "@/lib/services/jobDetail";
import { JobPreview } from "@/components/jobs/JobPreview";
import { OfferForm } from "@/components/offers/OfferForm";
import { MyOfferCard } from "@/components/offers/MyOfferCard";
import { TripRequestsPanel } from "@/components/return-trips/TripRequestsPanel";
import { OfferList } from "@/components/offers/OfferList";
import { MissionStepper } from "@/components/jobs/MissionStepper";
import { PostDeliveryPanel } from "@/components/jobs/PostDeliveryPanel";
import ReturnPromptBanner from "@/components/return-trips/ReturnPromptBanner";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { formatTND, formatDateTime } from "@/lib/format";
import { interpolate } from "@/lib/i18n/interpolate";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import {
  BadgeCheck,
  Clock,
  CheckCircle,
  CheckCircle2,
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
  const jobId = params?.id
    ? parseInt(Array.isArray(params.id) ? params.id[0] : params.id)
    : null;
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [completing, setCompleting] = useState(false);
  // Dialogues applicatifs — remplacent window.confirm()/prompt() (non stylés,
  // non traduits, motif limité à une ligne).
  const [activeDialog, setActiveDialog] = useState<
    | "confirmDelivery"
    | "cancelJob"
    | "markDelivered"
    | "transporterCancel"
    | null
  >(null);
  const [cancelReason, setCancelReason] = useState("");
  const [transporterCancelling, setTransporterCancelling] = useState(false);
  const { showToast } = useToast();
  const { t } = useAppI18n();

  // Return trip booking state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingPrice, setBookingPrice] = useState("");
  const [bookingPayment, setBookingPayment] = useState<"DIGITAL" | "COD">(
    "DIGITAL",
  );
  const [bookingLoading, setBookingLoading] = useState(false);
  // D5 — structured request (default path when instant_booking is off)
  const [bookingDescription, setBookingDescription] = useState("");

  // Handle payment gateway return (D3): confirm the authoritative status with
  // the backend (/api/payments/verify/) — this is what flips the escrow to
  // HELD and starts the mission, including in SANDBOX mode.
  useEffect(() => {
    const paymentStatus = searchParams?.get("payment");
    const gatewayRef = searchParams?.get("ref");
    if (paymentStatus === "success") {
      (async () => {
        try {
          if (gatewayRef) {
            await verifierPaiement(gatewayRef);
          }
          showToast("success", t.jobDetail.paymentSuccess);
        } catch (_e) {
          showToast("error", t.jobDetail.paymentFailed);
        } finally {
          router.replace(`/jobs/${jobId}`, { scroll: false });
          fetchJob();
        }
      })();
    } else if (paymentStatus === "failed") {
      showToast("error", t.jobDetail.paymentFailed);
      router.replace(`/jobs/${jobId}`, { scroll: false });
    }
  }, [searchParams]);

  // D3 — MATCHED actions
  const [paying, setPaying] = useState(false);
  const [confirmingStart, setConfirmingStart] = useState(false);

  const handlePayNow = async () => {
    if (!jobId) return;
    setPaying(true);
    try {
      const res = await initierPaiement(jobId);
      if (res?.payment_url) {
        window.location.href = res.payment_url;
        return;
      }
      showToast("error", t.jobDetail.paymentFailed);
    } catch (error) {
      if (error instanceof ApiError && error.body?.error) {
        showToast("error", String(error.body.error));
      } else {
        showToast("error", t.jobDetail.paymentFailed);
      }
    } finally {
      setPaying(false);
    }
  };

  const handleConfirmStart = async () => {
    if (!jobId) return;
    setConfirmingStart(true);
    try {
      await confirmerDemarrage(jobId);
      showToast("success", t.jobDetail.startConfirmed);
      fetchJob();
    } catch (error) {
      if (error instanceof ApiError && error.body?.error) {
        showToast("error", String(error.body.error));
      } else {
        showToast("error", t.jobDetail.genericError);
      }
    } finally {
      setConfirmingStart(false);
    }
  };

  // Lecture deleguee a useJobDetail : etat, effet de chargement et distinction
  // des erreurs vivaient jusqu'ici au milieu des douze gestionnaires d'action.
  // Les noms sont conserves pour que ce commit ne fasse QUE deplacer.
  const {
    transport: job,
    chargement: loading,
    erreur: fetchError,
    relire: fetchJob,
  } = useJobDetail(jobId);

  const handleConfirmDelivery = async () => {
    setActiveDialog(null);
    setConfirming(true);
    try {
      await confirmerLivraisonParLeClient(job!.id);
      showToast("success", t.jobDetail.deliveryConfirmed);
      fetchJob();
    } catch (error) {
      if (error instanceof ApiError && error.body) {
        showToast("error", error.body?.error || t.jobDetail.confirmError);
      } else {
        showToast("error", t.jobDetail.genericError);
      }
    } finally {
      setConfirming(false);
    }
  };

  const handleBookReturnTrip = async () => {
    if (!bookingPrice || parseFloat(bookingPrice) <= 0) {
      showToast("error", t.jobDetail.invalidPrice);
      return;
    }
    setBookingLoading(true);
    try {
      await reserverTrajetRetour(job!.id, bookingPrice, bookingPayment);
      showToast("success", t.jobDetail.returnBooked);
      setShowBookingModal(false);
      fetchJob();
    } catch (error) {
      if (error instanceof ApiError && error.body) {
        showToast("error", error.body?.error || t.jobDetail.bookingError);
      } else {
        showToast("error", t.jobDetail.genericError);
      }
    } finally {
      setBookingLoading(false);
    }
  };

  // D5 — send a structured request on a return trip (default path)
  const handleSendTripRequest = async () => {
    if (!bookingPrice || parseFloat(bookingPrice) <= 0) {
      showToast("error", t.jobDetail.invalidPrice);
      return;
    }
    if (!bookingDescription.trim()) {
      showToast("error", t.jobDetail.requestDescriptionRequired);
      return;
    }
    setBookingLoading(true);
    try {
      await envoyerDemandeSurTrajet(
        job!.id,
        bookingDescription.trim(),
        bookingPrice,
        bookingPayment,
      );
      showToast("success", t.jobDetail.requestSent);
      setShowBookingModal(false);
      setBookingDescription("");
      fetchJob();
    } catch (error) {
      if (error instanceof ApiError && error.body) {
        showToast(
          "error",
          String(error.body?.error || t.jobDetail.genericError),
        );
      } else {
        showToast("error", t.jobDetail.genericError);
      }
    } finally {
      setBookingLoading(false);
    }
  };

  // D5 — client accepts the transporter's counter-proposal
  const [counterActionLoading, setCounterActionLoading] = useState(false);
  const handleAcceptCounter = async () => {
    const reqId = job?.my_trip_request?.id;
    if (!reqId) return;
    setCounterActionLoading(true);
    try {
      const resultat = await accepterContreProposition(reqId);
      showToast("success", t.jobDetail.counterAccepted);
      // C2.1 — accepter une contre-proposition CREE la reservation : le
      // paiement est l'etape suivante et immediate. Sans cette redirection, le
      // client restait sur le detail du trajet et devait trouver seul ou payer,
      // ce qui rompt le critere de convergence du parcours : a chaque etape, le
      // destinataire doit savoir ce qu'il a a faire.
      //
      // Destination : /jobs/<id>/book, l'ecran de CHOIX du moyen de paiement.
      // /reservation/<id> est le suivi d'une reservation deja payee : y
      // envoyer le client avant qu'il ait paye l'aurait laisse devant un etat
      // vide.
      //
      // L'ecran de paiement exige l'identifiant de l'offre en parametre : sans
      // lui il affiche « introuvable ». L'acceptation vient justement de creer
      // cette offre, et la reponse la porte.
      const offreId = resultat?.job?.accepted_transporter?.offer_id;
      router.push(
        offreId
          ? `/jobs/${job!.id}/book?offer=${offreId}`
          : `/jobs/${job!.id}/book`,
      );
    } catch (error) {
      if (error instanceof ApiError && error.body) {
        showToast(
          "error",
          String(error.body?.error || t.jobDetail.genericError),
        );
      } else {
        showToast("error", t.jobDetail.genericError);
      }
    } finally {
      setCounterActionLoading(false);
    }
  };

  const handleCancelTripRequest = async () => {
    const reqId = job?.my_trip_request?.id;
    if (!reqId) return;
    setCounterActionLoading(true);
    try {
      await annulerDemandeSurTrajet(reqId);
      showToast("success", t.jobDetail.requestCancelled);
      fetchJob();
    } catch (error) {
      showToast("error", t.jobDetail.genericError);
    } finally {
      setCounterActionLoading(false);
    }
  };

  const handleCancelJob = async () => {
    setActiveDialog(null);
    setCancelling(true);
    try {
      await annulerParLeClient(job!.id);
      showToast("success", t.jobDetail.cancelSuccess);
      fetchJob();
    } catch (error) {
      if (error instanceof ApiError && error.body) {
        showToast("error", error.body?.error || t.jobDetail.cancelError);
      } else {
        showToast("error", t.jobDetail.genericError);
      }
    } finally {
      setCancelling(false);
    }
  };

  // D7 — POD: delivery requires the client's 4-digit code (+ optional photo)
  const [deliveryPin, setDeliveryPin] = useState("");
  const [podFile, setPodFile] = useState<File | null>(null);
  const [milestoneLoading, setMilestoneLoading] = useState(false);

  const handleMarkDelivered = async () => {
    const hasBooking = !!job?.booking_payment_method;
    if (hasBooking && deliveryPin.trim().length !== 4) {
      showToast("error", t.jobDetail.pinRequired);
      return;
    }
    setActiveDialog(null);
    setCompleting(true);
    try {
      // La photo de preuve est optionnelle : le service rend une chaine vide
      // quand elle echoue, et la livraison s'enregistre quand meme.
      const podPhotoUrl = podFile ? await televerserPhotoPreuve(podFile) : "";
      await marquerLivre(job!.id, deliveryPin.trim(), podPhotoUrl);
      showToast("success", t.jobDetail.markedDelivered);
      setDeliveryPin("");
      setPodFile(null);
      fetchJob();
    } catch (err) {
      if (err instanceof ApiError && err.body) {
        showToast("error", String(err.body?.error || t.jobDetail.confirmError));
      } else {
        showToast("error", t.jobDetail.networkRetry);
      }
    } finally {
      setCompleting(false);
    }
  };

  // D2' — mission milestones (arrived at pickup / loaded-en route)
  const handleLogMilestone = async (event: "ARRIVED_PICKUP" | "LOADED") => {
    setMilestoneLoading(true);
    try {
      await enregistrerJalon(job!.id, event);
      showToast("success", t.jobDetail.milestoneSaved);
      fetchJob();
    } catch (err) {
      if (err instanceof ApiError && err.body?.error) {
        showToast("error", String(err.body.error));
      } else {
        showToast("error", t.jobDetail.genericError);
      }
    } finally {
      setMilestoneLoading(false);
    }
  };

  const handleTransporterCancel = async () => {
    if (!cancelReason.trim()) return;
    setTransporterCancelling(true);
    try {
      await annulerParLeTransporteur(job!.id, cancelReason.trim());
      setActiveDialog(null);
      setCancelReason("");
      showToast("success", t.jobDetail.transporterCancelSuccess);
      fetchJob();
    } catch (err) {
      if (err instanceof ApiError && err.body) {
        showToast(
          "error",
          String(err.body?.error || t.jobDetail.unexpectedError),
        );
      } else {
        showToast("error", t.jobDetail.networkError);
      }
    } finally {
      setTransporterCancelling(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-neutral-500">
        {t.jobDetail.loading}
      </div>
    );
  if (!job) {
    if (fetchError === "network")
      return (
        <div role="alert" className="p-8 text-center">
          <p className="text-neutral-900 font-medium">
            {t.jobDetail.loadFailTitle}
          </p>
          <p className="text-neutral-500 text-sm mt-1">
            {t.jobDetail.loadFailDesc}
          </p>
          <button
            onClick={fetchJob}
            className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {t.jobDetail.retry}
          </button>
        </div>
      );
    return (
      <div className="p-8 text-center text-red-500">{t.jobDetail.notFound}</div>
    );
  }

  const isOwner = user?.id === job.owner?.id;
  const isClient = user?.role?.toUpperCase() === "CLIENT";
  const isTransporter = user?.role?.toUpperCase() === "TRANSPORTER";
  const isVerified = user?.is_verified === true;
  const isReturnTrip = job.is_return_trip === true;
  const isClientViewingReturnTrip =
    isClient && !isOwner && isReturnTrip && job.status === "PUBLISHED";
  // C2': when the transporter already has an offer (any status — the backend
  // forbids re-submission), show the "your offer" card instead of the form.
  const myOffer = job.my_offer ?? null;
  const showMyOfferCard =
    isTransporter && !isOwner && job.status === "PUBLISHED" && !!myOffer;
  const showOfferForm =
    isTransporter &&
    !isOwner &&
    job.status === "PUBLISHED" &&
    isVerified &&
    !myOffer;
  const showVerificationGate =
    isTransporter && !isOwner && job.status === "PUBLISHED" && !isVerified;
  const showOffersList =
    isOwner && (job.status === "PUBLISHED" || job.status === "IN_PROGRESS");
  const showCancelButton =
    isOwner &&
    isClient &&
    (job.status === "PUBLISHED" || job.status === "MATCHED");
  const isAssignedTransporter =
    isTransporter && job.accepted_transporter?.id === user?.id;
  const showDisputeButton =
    (job.status === "IN_PROGRESS" || job.status === "COMPLETED") &&
    (isOwner || isAssignedTransporter) &&
    (!job.completed_at ||
      Date.now() - new Date(job.completed_at as string).getTime() <
        15 * 86400000);

  // Post-livraison logic — le détail des sous-états (confirmation, avis) est
  // désormais géré par <PostDeliveryPanel/> (D1' : un panneau cohérent).
  const isCompleted = job.status === "COMPLETED";
  const clientConfirmed = job.client_confirmed === true;
  const hasReviewed = job.has_reviewed === true;
  const showMarkDelivered =
    job.status === "IN_PROGRESS" && isAssignedTransporter;

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Status Banner */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">
            {interpolate(t.jobDetail.title, { id: job.id })}
          </h1>
          <StatusBadge status={job.status} />
        </div>

        {/* P1-02: Mission progress stepper */}
        <MissionStepper
          status={job.status}
          completedAt={job.completed_at ?? undefined}
        />

        {/* P1-05: View counter (visible to job owner) */}
        {isOwner && (job.view_count ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 justify-end">
            <Eye className="w-3.5 h-3.5" />
            {interpolate(t.jobDetail.viewCount, {
              count: job.view_count ?? 0,
              s: (job.view_count ?? 0) > 1 ? "s" : "",
            })}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-8">
          {/* Main Content: Job Preview */}
          <div className="min-w-0 max-w-full">
            <JobPreview data={job} isOwner={isOwner} />

            {/* Accepted Transporter Info (visible when job is assigned) */}
            {job.accepted_transporter &&
              (job.status === "IN_PROGRESS" || isCompleted) && (
                <div className="mt-6 bg-white rounded-xl shadow-sm border border-neutral-200 p-5">
                  <h3 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-brand-600" />
                    {t.jobDetail.assignedTransporter}
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
                    <div className="text-end">
                      <p className="text-lg font-bold text-neutral-900">
                        {formatTND(
                          Number(job.accepted_transporter.total_price) || 0,
                        )}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {t.jobDetail.acceptedPrice}
                      </p>
                    </div>
                  </div>
                  {/* P2-06: Quick link to profile */}
                  <Link
                    href={`/profile/${job.accepted_transporter.id}`}
                    className="mt-3 w-full py-2 text-sm text-brand-600 border border-brand-600/20 rounded-lg font-medium hover:bg-brand-600/5 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {t.jobDetail.viewFullProfile}
                    <ArrowRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
                  </Link>
                </div>
              )}
          </div>

          {/* Sidebar: Actions */}
          <div className="space-y-6 min-w-0 flex-shrink-0">
            {/* Verification Gate */}
            {showVerificationGate && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-800">
                    {t.jobDetail.verifRequired}
                  </h3>
                </div>
                <p className="text-sm text-amber-700 mb-3">
                  {t.jobDetail.verifRequiredDesc}
                </p>
                <Link
                  href="/documents"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                >
                  <ShieldAlert className="w-4 h-4" />
                  {t.jobDetail.completeVerif}
                </Link>
              </div>
            )}

            {/* WS-F F1 — owner's return trip management panel */}
            {isOwner && isReturnTrip && (
              <TripRequestsPanel job={job} onChanged={fetchJob} />
            )}

            {/* Transporter Actions */}
            {showMyOfferCard && myOffer && (
              <MyOfferCard offer={myOffer} onChanged={fetchJob} />
            )}
            {showOfferForm && (
              <OfferForm
                jobId={job.id}
                jobType={job.job_type}
                commissionRate={
                  typeof job.commission_rate === "number"
                    ? job.commission_rate
                    : null
                }
                priceTndMin={
                  job.price_tnd_min != null
                    ? Number(job.price_tnd_min)
                    : undefined
                }
                priceTndMax={
                  job.price_tnd_max != null
                    ? Number(job.price_tnd_max)
                    : undefined
                }
                onOfferSubmitted={() => {
                  showToast("success", t.jobDetail.offerSent);
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
                  {t.jobDetail.client}
                </h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-600/10 flex items-center justify-center text-brand-600 font-bold text-sm">
                    {(job.owner.first_name || job.owner.name?.[0] || "C")[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900 group-hover:text-brand-600 transition-colors">
                      {job.owner.name ||
                        `${job.owner.first_name || t.jobDetail.client} ${(job.owner.last_name || "")[0]}.`}
                    </p>
                    {job.owner.rating && (
                      <div className="flex items-center gap-1 text-xs text-neutral-500">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {job.owner.rating.toFixed(1)} ·{" "}
                        {job.owner.review_count || 0} {t.profile.reviews}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-brand-500 transition-colors rtl:-scale-x-100" />
                </div>
              </Link>
            )}

            {/* Route Estimation */}
            {job.pickup_governorate && job.dropoff_governorate && (
              <div className="bg-white rounded-xl shadow-sm p-4 border border-neutral-200">
                <h3 className="text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-2">
                  <Route className="w-4 h-4 text-brand-600" />
                  {t.jobDetail.routeEstimation}
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
                  {t.jobDetail.offersReceived}
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
              <ReturnTripClientPanel
                job={job}
                actionEnCours={counterActionLoading}
                onOuvrirLaDemande={() => {
                  setBookingPrice(String(job.price_tnd_min || ""));
                  setBookingPayment("DIGITAL");
                  setShowBookingModal(true);
                }}
                onAccepterContreProposition={handleAcceptCounter}
                onRetirerLaDemande={handleCancelTripRequest}
              />
            )}

            {/* Booking Confirmation Modal */}
            <TripRequestDialog
              ouvert={showBookingModal}
              job={job}
              description={bookingDescription}
              prix={bookingPrice}
              paiement={bookingPayment}
              enCours={bookingLoading}
              onDescriptionChange={setBookingDescription}
              onPrixChange={setBookingPrice}
              onPaiementChange={setBookingPayment}
              onFermer={() => setShowBookingModal(false)}
              onValider={
                job.instant_booking
                  ? handleBookReturnTrip
                  : handleSendTripRequest
              }
            />

            {/* Trust & Security Banner */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-700 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                {t.jobDetail.trustTitle}
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-xs text-neutral-600">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{t.jobDetail.trustVerified}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-neutral-600">
                  <Wallet className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 mt-0.5" />
                  <span>{t.jobDetail.trustEscrow}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-neutral-600">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{t.jobDetail.trustDisputes}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-neutral-600">
                  <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>{t.jobDetail.trustReviews}</span>
                </li>
              </ul>
            </div>

            {/* D3 — MATCHED: assigned, payment being secured */}
            {job.status === "MATCHED" && (isOwner || isAssignedTransporter) && (
              <MissionMatchedPanel
                job={job}
                estLeProprietaire={isOwner}
                estLeTransporteurAssigne={isAssignedTransporter}
                paiementEnCours={paying}
                demarrageEnCours={confirmingStart}
                onPayer={handlePayNow}
                onConfirmerLeDemarrage={handleConfirmStart}
              />
            )}

            {/* In Progress Status */}
            {job.status === "IN_PROGRESS" && (
              <MissionInProgressPanel
                job={job}
                estLeTransporteurAssigne={isAssignedTransporter}
                peutMarquerLivre={showMarkDelivered}
                jalonEnCours={milestoneLoading}
                livraisonEnCours={completing}
                onEnregistrerJalon={handleLogMilestone}
                onDemanderLaLivraison={() => setActiveDialog("markDelivered")}
                onDemanderLAnnulation={() =>
                  setActiveDialog("transporterCancel")
                }
              />
            )}

            {/* ============================================ */}
            {/* POST-LIVRAISON FLOW (BL-03, UX-01, D1')     */}
            {/* Panneau unique cohérent — cf PostDeliveryPanel */}
            {/* ============================================ */}

            {/* T4.4 — l'amorce de retour à vide. Réservée au transporteur qui
                a exécuté la mission : le client n'a rien à publier, et le
                propriétaire d'un trajet retour n'est pas dans ce cas de figure.
                Placée AVANT le panneau post-livraison, parce que c'est l'action
                la plus rentable de l'écran à cet instant. */}
            {isCompleted && isAssignedTransporter && (
              <ReturnPromptBanner
                missionId={job.id}
                depuis={job.dropoff_governorate ?? ""}
                vers={job.pickup_governorate ?? ""}
              />
            )}

            {isCompleted && (
              <PostDeliveryPanel
                jobId={job.id}
                isOwner={isOwner}
                isTransporter={isTransporter}
                clientConfirmed={clientConfirmed}
                hasReviewed={hasReviewed}
                confirming={confirming}
                onConfirmClick={() => setActiveDialog("confirmDelivery")}
                onReviewSubmitted={fetchJob}
              />
            )}

            {/* Cancel Button — visible on PUBLISHED/MATCHED for client owner */}
            {showCancelButton && (
              <button
                onClick={() => setActiveDialog("cancelJob")}
                disabled={cancelling}
                className="flex items-center justify-center gap-2 w-full py-3 border border-neutral-300 bg-white text-neutral-700 rounded-xl text-sm font-semibold hover:bg-neutral-50 hover:border-neutral-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? (
                  t.jobDetail.cancelling
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    {t.jobDetail.cancelThisMission}
                  </>
                )}
              </button>
            )}

            {/* Dispute Button — visible on IN_PROGRESS or COMPLETED */}
            {showDisputeButton && (
              <Link
                href={`/litiges?job=${job.id}`}
                className="flex items-center justify-center gap-2 w-full py-3 border border-red-200 bg-red-50 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                {t.jobDetail.reportProblem}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* DIALOGUES — remplacent window.confirm/prompt */}
      {/* ============================================ */}
      <JobDetailDialogs
        dialogueOuvert={activeDialog}
        job={job}
        codeLivraison={deliveryPin}
        motifAnnulation={cancelReason}
        confirmationEnCours={confirming}
        annulationEnCours={cancelling}
        livraisonEnCours={completing}
        annulationTransporteurEnCours={transporterCancelling}
        onCodeChange={setDeliveryPin}
        onPhotoChange={setPodFile}
        onMotifChange={setCancelReason}
        onFermer={() => setActiveDialog(null)}
        onConfirmerReception={handleConfirmDelivery}
        onAnnulerLeTransport={handleCancelJob}
        onMarquerLivre={handleMarkDelivered}
        onAnnulerCoteTransporteur={handleTransporterCancel}
      />
    </div>
  );
}
