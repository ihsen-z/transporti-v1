"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiClient, ApiError } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import Link from "next/link";
import {
  MapPin,
  Truck,
  CreditCard,
  Banknote,
  ShieldCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  User,
  Star,
  Wallet,
  FileText,
  ExternalLink,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface BookingData {
  id: number;
  job: number;
  final_price: string;
  commission_rate: string;
  payment_method: "DIGITAL" | "COD";
  cod_allowed: boolean;
  created_at: string;
  accepted_offer: number;
}

interface JobData {
  id: number;
  job_type: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_governorate: string;
  dropoff_governorate: string;
  scheduled_date: string;
  accepted_transporter?: {
    name: string;
    phone?: string;
    total_price: number;
  };
  owner?: {
    id: number;
  };
}

interface EscrowData {
  id: number;
  status: string;
  amount: string;
  created_at: string;
}

/* -------------------------------------------------------------------------- */
/*  Booking Page                                                              */
/* -------------------------------------------------------------------------- */

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useAppI18n();

  const jobId = params?.jobId
    ? parseInt(Array.isArray(params.jobId) ? params.jobId[0] : params.jobId)
    : null;

  const [job, setJob] = useState<JobData | null>(null);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [escrow, setEscrow] = useState<EscrowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initiatingPayment, setInitiatingPayment] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch job details
      const jobData = await apiClient.get<any>(`/api/jobs/${jobId}/`);
      setJob(jobData);

      // Fetch booking for this job
      try {
        const bookingData = await apiClient.get<any>(
          `/api/jobs/${jobId}/booking/`,
        );
        setBooking(bookingData);
      } catch {
        // Booking may not exist yet
        setBooking(null);
      }

      // Fetch escrow status
      try {
        const escrowData = await apiClient.get<any>(
          `/api/jobs/${jobId}/escrow/`,
        );
        setEscrow(
          Array.isArray(escrowData) && escrowData.length > 0
            ? escrowData[0]
            : escrowData?.results?.[0] || null,
        );
      } catch {
        setEscrow(null);
      }
    } catch (err) {
      console.error("Error fetching booking data:", err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (jobId) fetchAll();
  }, [jobId, fetchAll]);

  /* ---- Initiate Digital Payment ---- */
  const handleInitiatePayment = async () => {
    if (!jobId) return;
    setInitiatingPayment(true);
    try {
      const result = await apiClient.post<any>("/api/payments/initiate/", {
        job_id: jobId,
      });

      if (result.payment_url) {
        showToast("success", t.booking.redirectingToast);
        // Redirect to payment gateway
        window.location.href = result.payment_url;
      } else {
        showToast("error", t.booking.paymentUrlUnavailable);
      }
    } catch (error) {
      if (error instanceof ApiError && error.body) {
        const msg = (error.body as any)?.error || t.booking.paymentError;
        showToast("error", msg);
      } else {
        showToast("error", t.booking.networkErrorRetry);
      }
    } finally {
      setInitiatingPayment(false);
    }
  };

  /* ---- Helpers ---- */
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-TN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const jobTypeLabel: Record<string, string> = {
    TRANSPORT: t.booking.jobTypeTransport,
    MOVING: t.booking.jobTypeMoving,
    DELIVERY: t.booking.jobTypeDelivery,
  };

  const escrowStatusConfig: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    INITIATED: {
      label: t.booking.escrowInitiated,
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
    },
    HELD: {
      label: t.booking.escrowHeld,
      color: "text-green-700",
      bg: "bg-green-50 border-green-200",
    },
    RELEASED: {
      label: t.booking.escrowReleasedStatus,
      color: "text-blue-700",
      bg: "bg-blue-50 border-blue-200",
    },
    REFUNDED: {
      label: t.booking.escrowRefunded,
      color: "text-purple-700",
      bg: "bg-purple-50 border-purple-200",
    },
    FAILED: {
      label: t.booking.escrowFailed,
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
    },
  };

  /* ---- Loading / Error ---- */
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">
            {t.booking.reservationLoading}
          </p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-neutral-900 mb-1">
          {t.booking.reservationNotFound}
        </h2>
        <p className="text-neutral-500 text-sm mb-4">
          {t.booking.notFoundNoAccess}
        </p>
        <Link
          href="/jobs"
          className="text-brand-600 font-medium hover:text-brand-700"
        >
          {t.booking.backToJobs}
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === job.owner?.id;
  const price = booking
    ? parseFloat(booking.final_price)
    : job.accepted_transporter?.total_price || 0;
  const commissionRate = booking
    ? parseFloat(booking.commission_rate) * 100
    : 15;
  const commissionAmount = (price * commissionRate) / 100;
  const netTransporteur = price - commissionAmount;
  const isDigital = booking?.payment_method === "DIGITAL";
  const isCOD = booking?.payment_method === "COD";
  const needsPayment =
    isDigital &&
    (!escrow || escrow.status === "INITIATED" || escrow.status === "FAILED");
  const escrowActive = escrow?.status === "HELD";
  const escrowReleased = escrow?.status === "RELEASED";

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link
          href={`/jobs/${jobId}`}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" />
          {interpolate(t.booking.backToMission, { id: jobId ?? "" })}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600/10 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-brand-600" />
            </div>
            {t.booking.pageTitle}
          </h1>
          <p className="text-neutral-500 mt-1 text-sm">
            {interpolate(t.booking.missionSubtitle, {
              id: jobId ?? "",
              type: jobTypeLabel[job.job_type] || job.job_type,
            })}
          </p>
        </div>

        <div className="space-y-6">
          {/* ======================================== */}
          {/* CARD 1: Route Summary                    */}
          {/* ======================================== */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-neutral-700 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-brand-600" />
              {t.booking.routeDetails}
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-neutral-400 font-medium">{t.booking.departure}</p>
                  <p className="text-sm text-neutral-900">
                    {job.pickup_address || job.pickup_governorate}
                  </p>
                </div>
              </div>
              <div className="ms-4 border-s-2 border-dashed border-neutral-200 h-4" />
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-neutral-400 font-medium">
                    {t.booking.destination}
                  </p>
                  <p className="text-sm text-neutral-900">
                    {job.dropoff_address || job.dropoff_governorate}
                  </p>
                </div>
              </div>
            </div>

            {job.scheduled_date && (
              <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center gap-2 text-sm text-neutral-600">
                <Clock className="w-4 h-4 text-neutral-400" />
                {formatDate(job.scheduled_date)}
              </div>
            )}
          </div>

          {/* ======================================== */}
          {/* CARD 2: Transporter Info                 */}
          {/* ======================================== */}
          {job.accepted_transporter && (
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-neutral-700 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-brand-600" />
                {t.booking.transportAssigned}
              </h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-600/10 flex items-center justify-center text-brand-600 font-bold text-lg">
                    {(job.accepted_transporter.name || "T")[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-900 flex items-center gap-1.5">
                      {job.accepted_transporter.name}
                      <ShieldCheck className="w-4 h-4 text-green-500" />
                    </p>
                    {job.accepted_transporter.phone && (
                      <p className="text-xs text-neutral-500">
                        📞 {job.accepted_transporter.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================== */}
          {/* CARD 3: Financial Breakdown              */}
          {/* ======================================== */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-neutral-700 mb-4 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-brand-600" />
              {t.booking.financialDetails}
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">{t.booking.transportPrice}</span>
                <span className="font-medium text-neutral-900">
                  {price.toFixed(2)} TND
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">
                  {interpolate(t.booking.platformFeePct, {
                    rate: commissionRate.toFixed(0),
                  })}
                </span>
                <span className="text-neutral-500">
                  - {commissionAmount.toFixed(2)} TND
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600 font-medium">
                  {t.booking.transporterNet}
                </span>
                <span className="font-semibold text-brand-600">
                  {netTransporteur.toFixed(2)} TND
                </span>
              </div>
              <div className="border-t border-neutral-100 pt-3 flex justify-between">
                <span className="font-semibold text-neutral-900">
                  {t.booking.totalPayClient}
                </span>
                <span className="text-xl font-bold text-brand-600">
                  {price.toFixed(2)} TND
                </span>
              </div>
            </div>

            {/* Payment Method Badge */}
            <div className="mt-4 pt-4 border-t border-neutral-100">
              {isDigital ? (
                <div className="flex items-center gap-3 p-3 bg-brand-600/5 rounded-xl border border-brand-600/10">
                  <CreditCard className="w-5 h-5 text-brand-600" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {t.booking.paymentDigital}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {t.booking.paymentDigitalDesc}
                    </p>
                  </div>
                </div>
              ) : isCOD ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                  <Banknote className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {t.booking.paymentCODParen}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {t.booking.paymentCODAtDelivery}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <Clock className="w-5 h-5 text-neutral-400" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {t.booking.paymentPending}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {t.booking.paymentPendingDesc}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ======================================== */}
          {/* CARD 4: Escrow Status (Digital Only)     */}
          {/* ======================================== */}
          {isDigital && (
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-neutral-700 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                {t.booking.escrowStatusTitle}
              </h2>

              {escrow ? (
                <div
                  className={`p-4 rounded-xl border ${escrowStatusConfig[escrow.status]?.bg || "bg-neutral-50 border-neutral-200"}`}
                >
                  <div className="flex items-center gap-2">
                    {escrow.status === "HELD" ? (
                      <ShieldCheck className="w-5 h-5 text-green-600" />
                    ) : escrow.status === "RELEASED" ? (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-600" />
                    )}
                    <span
                      className={`font-semibold ${escrowStatusConfig[escrow.status]?.color || "text-neutral-700"}`}
                    >
                      {escrowStatusConfig[escrow.status]?.label ||
                        escrow.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2 mb-4">
                    {interpolate(t.booking.escrowAmount, { amount: escrow.amount })}
                  </p>
                  
                  {/* Timeline */}
                  <div className="space-y-3 relative before:absolute before:inset-0 before:ms-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-200 before:to-transparent">
                    {/* Booking Created */}
                    {booking?.created_at && (
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-neutral-300 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                        <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-2 rounded border border-neutral-100 bg-white shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium text-xs text-neutral-900">{t.booking.timelineBookingCreated}</div>
                            <time className="text-[10px] font-medium text-neutral-500">{formatDate(booking.created_at)}</time>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Escrow Initiated/Held */}
                    {escrow?.created_at && (
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className={`flex items-center justify-center w-4 h-4 rounded-full border-2 border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${escrow.status === "HELD" || escrow.status === "RELEASED" ? "bg-green-500" : "bg-neutral-300"}`} />
                        <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-2 rounded border border-neutral-100 bg-white shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium text-xs text-neutral-900">{t.booking.timelineFundsSecured}</div>
                            <time className="text-[10px] font-medium text-neutral-500">{formatDate(escrow.created_at)}</time>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Escrow Released */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className={`flex items-center justify-center w-4 h-4 rounded-full border-2 border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${escrow.status === "RELEASED" ? "bg-blue-500" : "bg-neutral-300"}`} />
                      <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-2 rounded border border-neutral-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-xs text-neutral-900">{t.booking.timelineFundsReleased}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">
                      {t.booking.paymentNotYetDone}
                    </span>
                  </div>
                  <p className="text-xs text-amber-600 mt-1">
                    {t.booking.clickPayToSecure}
                  </p>
                </div>
              )}

              {/* Pay Now Button */}
              {isOwner && needsPayment && (
                <button
                  onClick={handleInitiatePayment}
                  disabled={initiatingPayment}
                  className="mt-4 w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-brand-600/20"
                >
                  {initiatingPayment ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {t.booking.redirecting}
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      {interpolate(t.booking.payNowAmount, {
                        amount: price.toFixed(2),
                      })}
                    </>
                  )}
                </button>
              )}

              {/* Escrow Active Confirmation */}
              {escrowActive && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                  <p className="text-sm font-semibold text-green-800">
                    {t.booking.escrowSecuredTitle}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {t.booking.escrowSecuredDesc}
                  </p>
                </div>
              )}

              {escrowReleased && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                  <p className="text-sm font-semibold text-blue-800">
                    {t.booking.escrowReleasedTitle}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {t.booking.escrowReleasedDesc}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ======================================== */}
          {/* Trust & Security Footer                  */}
          {/* ======================================== */}
          <div className="bg-brand-600/5 border border-brand-600/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-brand-600" />
              <h3 className="font-semibold text-neutral-900 text-sm">
                {t.booking.protectedTitle}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-neutral-600">
                  {t.booking.protectedVerified}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Wallet className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-neutral-600">
                  {t.booking.protectedEscrow}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Star className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-neutral-600">
                  {t.booking.protectedSupport}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
