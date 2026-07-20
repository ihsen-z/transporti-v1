"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiClient, ApiError } from "@/lib/api/client";
import type { JobDetail } from "@/lib/types/jobs";
import { JobPreview } from "@/components/jobs/JobPreview";
import { OfferForm } from "@/components/offers/OfferForm";
import { MyOfferCard } from "@/components/offers/MyOfferCard";
import { TripRequestsPanel } from "@/components/return-trips/TripRequestsPanel";
import { OfferList } from "@/components/offers/OfferList";
import { MissionStepper } from "@/components/jobs/MissionStepper";
import { PostDeliveryPanel } from "@/components/jobs/PostDeliveryPanel";
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
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<"network" | "not_found" | null>(
    null,
  );
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
            await apiClient.post("/api/payments/verify/", {
              gateway_ref: gatewayRef,
            });
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
      const res = await apiClient.post<{ payment_url: string }>(
        "/api/payments/initiate/",
        { job_id: jobId, platform: "web" },
      );
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
      await apiClient.post(`/api/jobs/${jobId}/confirm-start/`, {});
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

  const jobId = params?.id
    ? parseInt(Array.isArray(params.id) ? params.id[0] : params.id)
    : null;

  useEffect(() => {
    if (jobId) fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await apiClient.get<JobDetail>(`/api/jobs/${jobId}/`);
      setJob(data as JobDetail);
    } catch (error) {
      console.error("Error fetching job:", error);
      // Distinguer "le job n'existe pas / accès refusé" (4xx) d'une panne
      // réseau ou serveur, pour ne pas afficher un faux "introuvable".
      if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500
      ) {
        setFetchError("not_found");
      } else {
        setFetchError("network");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    setActiveDialog(null);
    setConfirming(true);
    try {
      await apiClient.post("/api/payments/confirm-completion/", {
        job_id: job!.id,
      });
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
      await apiClient.post(`/api/jobs/${job!.id}/book-return/`, {
        proposed_price: bookingPrice,
        payment_method: bookingPayment,
      });
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
      await apiClient.post(`/api/jobs/${job!.id}/requests/`, {
        description: bookingDescription.trim(),
        proposed_price: bookingPrice,
        payment_method: bookingPayment,
      });
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
      await apiClient.post(`/api/trip-requests/${reqId}/accept-counter/`, {});
      showToast("success", t.jobDetail.counterAccepted);
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
      setCounterActionLoading(false);
    }
  };

  const handleCancelTripRequest = async () => {
    const reqId = job?.my_trip_request?.id;
    if (!reqId) return;
    setCounterActionLoading(true);
    try {
      await apiClient.post(`/api/trip-requests/${reqId}/cancel/`, {});
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
      await apiClient.post(`/api/jobs/${job!.id}/cancel/`, {});
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
      // Optional POD photo — multipart via fetch natif (apiClient est JSON-only)
      let podPhotoUrl = "";
      if (podFile) {
        try {
          const fd = new FormData();
          fd.append("photo", podFile);
          const apiBase =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const token = localStorage.getItem("transporti_access_token");
          const upResp = await fetch(`${apiBase}/api/upload/photo/`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: fd,
          });
          if (upResp.ok) {
            const up = (await upResp.json()) as {
              url?: string;
              photo_url?: string;
            };
            podPhotoUrl = up?.url || up?.photo_url || "";
          }
        } catch (_e) {
          /* photo optionnelle — ne bloque pas la livraison */
        }
      }
      await apiClient.post(`/api/jobs/${job!.id}/complete/`, {
        pin: deliveryPin.trim(),
        pod_photo_url: podPhotoUrl,
      });
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
      await apiClient.post(`/api/jobs/${job!.id}/events/`, { event });
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
      await apiClient.post(`/api/jobs/${job!.id}/transporter-cancel/`, {
        reason: cancelReason.trim(),
      });
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
                  href="/verification"
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
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-purple-900">
                      {t.jobDetail.returnAvailable}
                    </h3>
                    <p className="text-xs text-purple-600">
                      {t.jobDetail.returnReducedRate}
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
                          `${job.owner?.first_name || t.jobDetail.defaultTransporter}`}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-neutral-500">
                        <UserCheck className="w-3 h-3 text-green-500" />
                        {t.jobDetail.verifiedTransporter}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Capacity Info */}
                {job.available_capacity && (
                  <div className="flex items-center gap-2 text-sm text-purple-700 mb-3">
                    <Package className="w-4 h-4" />
                    <span>
                      {interpolate(t.jobDetail.capacity, {
                        cap: job.available_capacity,
                      })}
                    </span>
                  </div>
                )}

                {/* Price */}
                {(job.price_tnd_min || job.price_tnd_max) && (
                  <div className="text-center bg-white rounded-lg py-2 px-3 mb-3 border border-purple-100">
                    <p className="text-xs text-neutral-500">
                      {t.jobDetail.indicativePrice}
                    </p>
                    <p className="text-xl font-bold text-purple-700">
                      {job.price_tnd_min && job.price_tnd_max
                        ? `${formatTND(Number(job.price_tnd_min) || 0)} — ${formatTND(Number(job.price_tnd_max) || 0)}`
                        : job.price_tnd_min
                          ? `${t.offerForm.from} ${formatTND(Number(job.price_tnd_min) || 0)}`
                          : `${t.offerForm.upTo} ${formatTND(Number(job.price_tnd_max) || 0)}`}
                    </p>
                  </div>
                )}

                {/* D5 — client's existing structured request status */}
                {job.my_trip_request &&
                job.my_trip_request.status !== "CANCELLED" &&
                job.my_trip_request.status !== "REJECTED" ? (
                  <div className="bg-white rounded-xl p-4 mb-2 border border-purple-200">
                    <p className="text-sm font-semibold text-neutral-900 mb-1">
                      {t.jobDetail.myRequestTitle}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {formatTND(job.my_trip_request.proposed_price)} ·{" "}
                      {job.my_trip_request.status === "PENDING"
                        ? t.jobDetail.myRequestPending
                        : job.my_trip_request.status === "ACCEPTED"
                          ? t.jobDetail.myRequestAccepted
                          : t.jobDetail.myRequestCountered}
                    </p>
                    {job.my_trip_request.status === "COUNTERED" &&
                      job.my_trip_request.counter_price != null && (
                        <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                          <p className="text-sm text-purple-800 mb-2">
                            {interpolate(t.jobDetail.counterProposal, {
                              price: formatTND(
                                job.my_trip_request.counter_price,
                              ),
                            })}
                            {job.my_trip_request.response_message && (
                              <span className="block text-xs italic mt-1">
                                « {job.my_trip_request.response_message} »
                              </span>
                            )}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleAcceptCounter}
                              disabled={counterActionLoading}
                              className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
                            >
                              {t.jobDetail.acceptCounter}
                            </button>
                            <button
                              onClick={handleCancelTripRequest}
                              disabled={counterActionLoading}
                              className="flex-1 py-2 border border-neutral-300 text-neutral-600 rounded-lg text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
                            >
                              {t.jobDetail.declineCounter}
                            </button>
                          </div>
                        </div>
                      )}
                    {job.my_trip_request.status === "PENDING" && (
                      <button
                        onClick={handleCancelTripRequest}
                        disabled={counterActionLoading}
                        className="mt-2 text-xs text-neutral-500 hover:text-red-500 underline"
                      >
                        {t.jobDetail.cancelMyRequest}
                      </button>
                    )}
                  </div>
                ) : (
                  /* Primary CTA — request (default) or instant booking (D11) */
                  <button
                    onClick={() => {
                      setBookingPrice(String(job.price_tnd_min || ""));
                      setBookingPayment("DIGITAL");
                      setShowBookingModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20 mb-2"
                  >
                    <Truck className="w-5 h-5" />
                    {job.instant_booking
                      ? t.jobDetail.bookThisTrip
                      : t.jobDetail.sendRequest}
                  </button>
                )}

                {/* Secondary CTA — Contacter */}
                <Link
                  href={`/messages?contact=${job.owner?.id}&subject=Trajet retour #${job.id}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-purple-300 text-purple-700 rounded-xl font-medium hover:bg-purple-50 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  {t.jobDetail.contactTransporter}
                </Link>
                <p className="text-xs text-purple-500 text-center mt-2 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {t.jobDetail.securePaymentEscrow}
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
                          {job.instant_booking
                            ? t.jobDetail.confirmBooking
                            : t.jobDetail.sendRequestTitle}
                        </h3>
                        <p className="text-sm text-purple-200">
                          {interpolate(t.jobDetail.returnTripRef, {
                            id: job.id,
                          })}
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

                    {/* D5 — goods description (structured request mode) */}
                    {!job.instant_booking && (
                      <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                          {t.jobDetail.requestDescriptionLabel}
                        </label>
                        <textarea
                          value={bookingDescription}
                          onChange={(e) =>
                            setBookingDescription(e.target.value)
                          }
                          maxLength={1000}
                          className="w-full border-2 border-neutral-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all h-20"
                          placeholder={
                            t.jobDetail.requestDescriptionPlaceholder
                          }
                        />
                      </div>
                    )}

                    {/* Price input (negotiable) */}
                    <div>
                      <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                        {t.jobDetail.proposedPrice}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={bookingPrice}
                          onChange={(e) => setBookingPrice(e.target.value)}
                          className="w-full border-2 border-neutral-200 rounded-xl px-4 py-3 text-lg font-bold text-center focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
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
                      <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                        {t.jobDetail.paymentMethod}
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
                          {t.jobDetail.securePayment}
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
                          <Wallet className="w-4 h-4" />
                          {t.jobDetail.onDelivery}
                        </button>
                      </div>
                      {bookingPayment === "COD" &&
                        parseFloat(bookingPrice) > 300 && (
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {t.jobDetail.codMax}
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
                      {t.common.cancel}
                    </button>
                    <button
                      onClick={
                        job.instant_booking
                          ? handleBookReturnTrip
                          : handleSendTripRequest
                      }
                      disabled={
                        bookingLoading ||
                        !bookingPrice ||
                        parseFloat(bookingPrice) <= 0 ||
                        (!job.instant_booking && !bookingDescription.trim()) ||
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
            )}

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
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-amber-800">
                <h3 className="font-bold flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5" />
                  {t.jobDetail.matchedTitle}
                </h3>
                {/* Client + DIGITAL → pay now */}
                {isOwner && job.booking_payment_method === "DIGITAL" && (
                  <>
                    <p className="text-sm mb-3">
                      {t.jobDetail.matchedClientPay}
                    </p>
                    <button
                      onClick={handlePayNow}
                      disabled={paying}
                      className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      {paying ? (
                        <Clock className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                      {paying ? t.jobDetail.paying : t.jobDetail.payNow}
                    </button>
                  </>
                )}
                {/* Client + COD → waiting for transporter confirmation */}
                {isOwner && job.booking_payment_method === "COD" && (
                  <p className="text-sm">{t.jobDetail.matchedClientCod}</p>
                )}
                {/* Transporter + COD → confirm start */}
                {isAssignedTransporter &&
                  job.booking_payment_method === "COD" && (
                    <>
                      <p className="text-sm mb-3">
                        {t.jobDetail.matchedTransporterCod}
                      </p>
                      <button
                        onClick={handleConfirmStart}
                        disabled={confirmingStart}
                        className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                      >
                        {confirmingStart ? (
                          <Clock className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        {confirmingStart
                          ? t.jobDetail.confirming
                          : t.jobDetail.confirmStart}
                      </button>
                    </>
                  )}
                {/* Transporter + DIGITAL → waiting for client payment */}
                {isAssignedTransporter &&
                  job.booking_payment_method === "DIGITAL" && (
                    <p className="text-sm">
                      {t.jobDetail.matchedTransporterDigital}
                    </p>
                  )}
                <div className="mt-3 space-y-2">
                  <button
                    onClick={() => router.push(`/messages/${job.id}`)}
                    className="w-full py-2 bg-white border border-amber-300 text-amber-800 rounded-lg font-medium hover:bg-amber-100 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {t.jobDetail.openMessaging}
                  </button>
                  <Link
                    href={`/booking/${job.id}`}
                    className="w-full py-2 border border-amber-300 text-amber-800 rounded-lg font-medium hover:bg-amber-100 flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {t.jobDetail.viewBooking}
                  </Link>
                </div>
              </div>
            )}

            {/* In Progress Status */}
            {job.status === "IN_PROGRESS" && (
              <div className="bg-brand-600/5 border border-brand-600/20 rounded-xl p-4 text-brand-700">
                <h3 className="font-bold flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5" />
                  {t.jobDetail.missionInProgress}
                </h3>
                <p className="text-sm">
                  {isAssignedTransporter
                    ? t.jobDetail.assignedToYou
                    : t.jobDetail.transporterAssignedInfo}
                </p>

                {/* D2' — mission timeline (visible to both parties) */}
                {(job.events?.length ?? 0) > 0 && (
                  <ul className="mt-3 space-y-1 text-xs">
                    {(job.events ?? []).map((e, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-brand-700"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span>
                          {(
                            {
                              ARRIVED_PICKUP: t.jobDetail.eventArrivedPickup,
                              LOADED: t.jobDetail.eventLoaded,
                              DELIVERED: t.jobDetail.eventDelivered,
                            } as Record<string, string>
                          )[e.event] || e.event}
                        </span>
                        <span className="text-brand-400 ms-auto">
                          {formatDateTime(e.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* D7 — the paying client holds the delivery code */}
                {job.delivery_pin && !isAssignedTransporter && (
                  <div className="mt-3 p-3 bg-white border-2 border-dashed border-brand-300 rounded-lg text-center">
                    <p className="text-xs text-neutral-500 mb-1">
                      {t.jobDetail.deliveryPinLabel}
                    </p>
                    <p className="text-2xl font-bold tracking-[0.4em] text-brand-700">
                      {job.delivery_pin}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      {t.jobDetail.deliveryPinHint}
                    </p>
                  </div>
                )}

                <div className="mt-3 space-y-2">
                  {/* D2' — next milestone for the assigned transporter */}
                  {isAssignedTransporter &&
                    !(job.events ?? []).some(
                      (e) => e.event === "ARRIVED_PICKUP",
                    ) && (
                      <button
                        onClick={() => handleLogMilestone("ARRIVED_PICKUP")}
                        disabled={milestoneLoading}
                        className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <MapPin className="w-4 h-4" />
                        {t.jobDetail.milestoneArrived}
                      </button>
                    )}
                  {isAssignedTransporter &&
                    (job.events ?? []).some(
                      (e) => e.event === "ARRIVED_PICKUP",
                    ) &&
                    !(job.events ?? []).some((e) => e.event === "LOADED") && (
                      <button
                        onClick={() => handleLogMilestone("LOADED")}
                        disabled={milestoneLoading}
                        className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Truck className="w-4 h-4" />
                        {t.jobDetail.milestoneLoaded}
                      </button>
                    )}
                  {/* P0-01: CTA "Marquer comme livré" — Transporteur uniquement */}
                  {showMarkDelivered && (
                    <button
                      onClick={() => setActiveDialog("markDelivered")}
                      disabled={completing}
                      className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 hover:shadow-md hover:shadow-emerald-600/20"
                    >
                      {completing ? (
                        <Clock className="w-4 h-4 animate-spin" />
                      ) : (
                        <Package className="w-4 h-4" />
                      )}
                      {completing
                        ? t.jobDetail.confirming
                        : t.jobDetail.markDelivered}
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/messages/${job.id}`)}
                    className="w-full py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {t.jobDetail.openMessaging}
                  </button>
                  <Link
                    href={`/booking/${job.id}`}
                    className="w-full py-2 border border-brand-600/30 text-brand-700 rounded-lg font-medium hover:bg-brand-600/5 flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {t.jobDetail.viewBooking}
                  </Link>
                  {/* P2-03: Cancel mutuel — transporteur peut annuler */}
                  {isAssignedTransporter && (
                    <button
                      onClick={() => setActiveDialog("transporterCancel")}
                      className="w-full py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 flex items-center justify-center gap-2 text-sm transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      {t.jobDetail.cancelMission}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ============================================ */}
            {/* POST-LIVRAISON FLOW (BL-03, UX-01, D1')     */}
            {/* Panneau unique cohérent — cf PostDeliveryPanel */}
            {/* ============================================ */}

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
                href={`/disputes?job=${job.id}`}
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

      <ConfirmModal
        open={activeDialog === "confirmDelivery"}
        title={t.jobDetail.confirmReceptionTitle}
        message={t.jobDetail.confirmReceptionMsg}
        confirmLabel={t.jobDetail.confirmReceptionLabel}
        confirmColor="brand"
        loading={confirming}
        onConfirm={handleConfirmDelivery}
        onCancel={() => setActiveDialog(null)}
      />

      <ConfirmModal
        open={activeDialog === "cancelJob"}
        title={t.jobDetail.cancelJobTitle}
        message={t.jobDetail.cancelJobMsg}
        confirmLabel={t.jobDetail.cancelJobLabel}
        cancelLabel={t.jobDetail.backLabel}
        confirmColor="red"
        loading={cancelling}
        onConfirm={handleCancelJob}
        onCancel={() => setActiveDialog(null)}
      />

      <ConfirmModal
        open={activeDialog === "markDelivered"}
        title={t.jobDetail.markDeliveredTitle}
        message={t.jobDetail.markDeliveredMsg}
        confirmLabel={t.jobDetail.markDeliveredLabel}
        confirmColor="brand"
        loading={completing}
        onConfirm={handleMarkDelivered}
        onCancel={() => setActiveDialog(null)}
        detail={
          <div className="space-y-3 text-start">
            {job?.booking_payment_method && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {t.jobDetail.podPinInputLabel}
                </label>
                <input
                  inputMode="numeric"
                  maxLength={4}
                  value={deliveryPin}
                  onChange={(e) =>
                    setDeliveryPin(
                      e.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                  className="w-full px-3 py-2 border rounded-lg text-center text-lg tracking-[0.3em] font-bold focus:ring-2 focus:ring-brand-500"
                  placeholder="••••"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t.jobDetail.podPhotoLabel}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPodFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-neutral-500"
              />
            </div>
          </div>
        }
      />

      <Modal
        open={activeDialog === "transporterCancel"}
        title={t.jobDetail.cancelJobTitle}
        onClose={() => {
          setActiveDialog(null);
          setCancelReason("");
        }}
        closeDisabled={transporterCancelling}
        footer={
          <>
            <Button
              variant="outline"
              fullWidth
              disabled={transporterCancelling}
              onClick={() => {
                setActiveDialog(null);
                setCancelReason("");
              }}
            >
              {t.jobDetail.backLabel}
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={transporterCancelling}
              loadingLabel={t.jobDetail.cancelling}
              disabled={!cancelReason.trim()}
              onClick={handleTransporterCancel}
            >
              {t.jobDetail.cancelJobLabel}
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-500 mb-4">
          {t.jobDetail.transporterCancelBody}
        </p>
        <Textarea
          label={t.jobDetail.cancelReasonLabel}
          required
          rows={3}
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder={t.jobDetail.cancelReasonPlaceholder}
        />
      </Modal>
    </div>
  );
}
