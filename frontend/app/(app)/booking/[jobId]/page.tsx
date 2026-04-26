"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiClient, ApiError } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
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

  const jobId = params?.jobId
    ? parseInt(Array.isArray(params.jobId) ? params.jobId[0] : params.jobId)
    : null;

  const [job, setJob] = useState<JobData | null>(null);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [escrow, setEscrow] = useState<EscrowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initiatingPayment, setInitiatingPayment] = useState(false);

  useEffect(() => {
    if (jobId) fetchAll();
  }, [jobId]);

  const fetchAll = async () => {
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
  };

  /* ---- Initiate Digital Payment ---- */
  const handleInitiatePayment = async () => {
    if (!jobId) return;
    setInitiatingPayment(true);
    try {
      const result = await apiClient.post<any>("/api/payments/initiate/", {
        job_id: jobId,
      });

      if (result.payment_url) {
        showToast("success", "Redirection vers la plateforme de paiement...");
        // Redirect to payment gateway
        window.location.href = result.payment_url;
      } else {
        showToast("error", "URL de paiement non disponible.");
      }
    } catch (error) {
      if (error instanceof ApiError && error.body) {
        const msg = (error.body as any)?.error || "Erreur lors du paiement.";
        showToast("error", msg);
      } else {
        showToast("error", "Erreur réseau. Veuillez réessayer.");
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
    TRANSPORT: "Transport de marchandises",
    MOVING: "Déménagement",
    DELIVERY: "Livraison",
  };

  const escrowStatusConfig: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    INITIATED: {
      label: "En attente de paiement",
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
    },
    HELD: {
      label: "Fonds sécurisés (Escrow actif)",
      color: "text-green-700",
      bg: "bg-green-50 border-green-200",
    },
    RELEASED: {
      label: "Paiement libéré au transporteur",
      color: "text-blue-700",
      bg: "bg-blue-50 border-blue-200",
    },
    REFUNDED: {
      label: "Remboursé",
      color: "text-purple-700",
      bg: "bg-purple-50 border-purple-200",
    },
    FAILED: {
      label: "Paiement échoué",
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
            Chargement de la réservation...
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
          Réservation introuvable
        </h2>
        <p className="text-neutral-500 text-sm mb-4">
          Cette mission n&apos;existe pas ou vous n&apos;y avez pas accès.
        </p>
        <Link
          href="/jobs"
          className="text-brand-600 font-medium hover:text-brand-700"
        >
          ← Retour aux missions
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
          <ArrowLeft className="w-4 h-4" />
          Retour à la mission #{jobId}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600/10 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-brand-600" />
            </div>
            Réservation
          </h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Mission #{jobId} · {jobTypeLabel[job.job_type] || job.job_type}
          </p>
        </div>

        <div className="space-y-6">
          {/* ======================================== */}
          {/* CARD 1: Route Summary                    */}
          {/* ======================================== */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-neutral-700 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-brand-600" />
              Détails du trajet
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-neutral-400 font-medium">Départ</p>
                  <p className="text-sm text-neutral-900">
                    {job.pickup_address || job.pickup_governorate}
                  </p>
                </div>
              </div>
              <div className="ml-4 border-l-2 border-dashed border-neutral-200 h-4" />
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-neutral-400 font-medium">
                    Destination
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
                Transporteur assigné
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
              Détails financiers
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Prix du transport</span>
                <span className="font-medium text-neutral-900">
                  {price.toFixed(2)} TND
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">
                  Commission plateforme ({commissionRate.toFixed(0)}%)
                </span>
                <span className="text-neutral-500">
                  {commissionAmount.toFixed(2)} TND
                </span>
              </div>
              <div className="border-t border-neutral-100 pt-3 flex justify-between">
                <span className="font-semibold text-neutral-900">
                  Total à payer
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
                      Paiement Digital (Escrow)
                    </p>
                    <p className="text-xs text-neutral-500">
                      Montant sécurisé, libéré après confirmation de livraison
                    </p>
                  </div>
                </div>
              ) : isCOD ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                  <Banknote className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      Paiement à la livraison (COD)
                    </p>
                    <p className="text-xs text-neutral-500">
                      Payez en espèces au transporteur à la réception
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                  <Clock className="w-5 h-5 text-neutral-400" />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      Mode de paiement en attente
                    </p>
                    <p className="text-xs text-neutral-500">
                      Le mode de paiement sera défini lors de l&apos;acceptation
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
                Statut du paiement sécurisé
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
                  <p className="text-xs text-neutral-500 mt-2">
                    Montant : {escrow.amount} TND · Créé le{" "}
                    {formatDate(escrow.created_at)}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">
                      Paiement non encore effectué
                    </span>
                  </div>
                  <p className="text-xs text-amber-600 mt-1">
                    Cliquez sur &ldquo;Payer maintenant&rdquo; pour sécuriser
                    votre transaction.
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
                      Redirection en cours...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Payer maintenant — {price.toFixed(2)} TND
                    </>
                  )}
                </button>
              )}

              {/* Escrow Active Confirmation */}
              {escrowActive && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                  <p className="text-sm font-semibold text-green-800">
                    ✅ Votre paiement est sécurisé
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Les fonds seront libérés au transporteur après votre
                    confirmation de livraison.
                  </p>
                </div>
              )}

              {escrowReleased && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                  <p className="text-sm font-semibold text-blue-800">
                    💸 Paiement libéré au transporteur
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    La transaction est finalisée. Merci d&apos;avoir utilisé
                    Transporti !
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
                Votre transaction est protégée
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-neutral-600">
                  Transporteur vérifié avec documents validés
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Wallet className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-neutral-600">
                  Escrow sécurisé — pas de paiement direct
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Star className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-neutral-600">
                  Support 24/48h en cas de litige
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
