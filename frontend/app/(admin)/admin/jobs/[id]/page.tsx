"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  User,
  Truck,
  CreditCard,
  MessageSquare,
  AlertTriangle,
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  JobStatusBadge,
  PaymentStatusBadge,
} from "@/components/admin/StatusBadge";
import StatusBadge from "@/components/admin/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/admin";
import { apiClient } from "@/lib/api/client";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface OfferData {
  id: number;
  transporter: string;
  transporterEmail: string;
  totalPrice: number;
  priceNet: number | null;
  commission: number | null;
  status: string;
  message: string;
  createdAt: string;
}

interface EscrowData {
  id: number;
  amount: number;
  status: string;
  createdAt: string;
}

interface ConversationData {
  id: number;
  isLocked: boolean;
  messageCount: number;
}

interface DisputeData {
  id: number;
  reason: string;
  status: string;
  openedBy: string;
  createdAt: string;
}

interface JobDetail {
  id: number;
  title: string;
  status: string;
  pickup: string;
  delivery: string;
  price: number;
  cityFrom: string;
  cityTo: string;
  job_type: string;
  created_at: string;
  clientName: string;
  clientEmail: string;
  transporterName: string;
  transporterEmail: string;
  offersCount: number;
  offers: OfferData[];
  escrow: EscrowData | null;
  conversation: ConversationData | null;
  disputes: DisputeData[];
}

/* -------------------------------------------------------------------------- */
/*  Offer status helpers                                                       */
/* -------------------------------------------------------------------------- */

const offerStatusColors: Record<string, string> = {
  PENDING: "bg-orange-100 text-orange-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-neutral-100 text-neutral-600",
  WITHDRAWN: "bg-neutral-100 text-neutral-600",
};

const offerStatusLabels: Record<string, string> = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  REJECTED: "Refusée",
  EXPIRED: "Expirée",
  WITHDRAWN: "Retirée",
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function AdminJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    async function fetchJob() {
      try {
        const data = await apiClient.get<JobDetail>(
          `/api/admin/jobs/${jobId}/`,
        );
        setJob(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors du chargement du job.",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchJob();
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-neutral-600 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-red-700">{error || "Job introuvable"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/jobs")}
            className="p-2 text-neutral-500 hover:text-brand-600 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-900">
                {job.title || `Job #${job.id}`}
              </h1>
              <JobStatusBadge status={job.status} />
            </div>
            <p className="text-neutral-500 text-sm mt-1">
              Job #{job.id} • Créé le {formatDate(job.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route + Transport */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-600" />
              Itinéraire
            </h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                  Départ
                </p>
                <p className="font-medium text-neutral-900">
                  {job.cityFrom || "-"}
                </p>
                <p className="text-sm text-neutral-600">{job.pickup || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                  Arrivée
                </p>
                <p className="font-medium text-neutral-900">
                  {job.cityTo || "-"}
                </p>
                <p className="text-sm text-neutral-600">
                  {job.delivery || "-"}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-neutral-400" />
                  <span className="text-neutral-600">
                    {job.job_type || "Standard"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-neutral-400" />
                  <span className="text-neutral-600">
                    {formatDate(job.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Offers */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-brand-600" />
              Offres ({job.offers?.length || 0})
            </h2>

            {!job.offers || job.offers.length === 0 ? (
              <p className="text-neutral-500 text-sm italic py-4 text-center">
                Aucune offre reçue
              </p>
            ) : (
              <div className="space-y-3">
                {job.offers.map((offer) => (
                  <div
                    key={offer.id}
                    className={`rounded-lg border p-4 ${
                      offer.status === "ACCEPTED"
                        ? "border-green-200 bg-green-50/50"
                        : "border-neutral-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-neutral-500" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 text-sm">
                            {offer.transporter}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {offer.transporterEmail}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-neutral-900">
                          {formatCurrency(offer.totalPrice)}
                        </span>
                        <StatusBadge
                          status={
                            offerStatusLabels[offer.status] || offer.status
                          }
                          colorClass={
                            offerStatusColors[offer.status] ||
                            "bg-neutral-100 text-neutral-600"
                          }
                        />
                      </div>
                    </div>
                    {offer.message && (
                      <p className="text-sm text-neutral-600 mt-2 pl-11 italic">
                        &ldquo;{offer.message}&rdquo;
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 pl-11 text-xs text-neutral-400">
                      <span>{formatDate(offer.createdAt)}</span>
                      {offer.commission != null && (
                        <span>
                          Commission: {formatCurrency(offer.commission)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Disputes */}
          {job.disputes && job.disputes.length > 0 && (
            <div className="bg-white rounded-xl border border-red-200 p-6">
              <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Litiges ({job.disputes.length})
              </h2>
              <div className="space-y-3">
                {job.disputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className="rounded-lg border border-red-100 bg-red-50/50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-neutral-900 text-sm">
                          {dispute.reason}
                        </p>
                        <p className="text-xs text-neutral-500">
                          Par {dispute.openedBy} •{" "}
                          {formatDate(dispute.createdAt)}
                        </p>
                      </div>
                      <StatusBadge
                        status={dispute.status}
                        colorClass={
                          dispute.status === "RESOLVED"
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-6">
          {/* Client card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">
              Client
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900">
                  {job.clientName}
                </p>
                <p className="text-sm text-neutral-500">{job.clientEmail}</p>
              </div>
            </div>
          </div>

          {/* Transporter card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">
              Transporteur
            </h3>
            {job.transporterName ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                  <Truck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">
                    {job.transporterName}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {job.transporterEmail}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-neutral-400 italic text-sm">Non assigné</p>
            )}
          </div>

          {/* Payment/Escrow card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">
              Paiement
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 text-sm">Montant</span>
                <span className="font-bold text-neutral-900 text-lg">
                  {formatCurrency(job.price || 0)}
                </span>
              </div>
              {job.escrow && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 text-sm">Escrow</span>
                    <PaymentStatusBadge status={job.escrow.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600 text-sm">
                      Montant escrow
                    </span>
                    <span className="font-medium text-neutral-900">
                      {formatCurrency(job.escrow.amount)}
                    </span>
                  </div>
                </>
              )}
              {!job.escrow && (
                <p className="text-neutral-400 italic text-sm">
                  Pas d&apos;escrow
                </p>
              )}
            </div>
          </div>

          {/* Conversation card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">
              Conversation
            </h3>
            {job.conversation ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600 text-sm flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" /> Messages
                  </span>
                  <span className="font-semibold text-neutral-900">
                    {job.conversation.messageCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600 text-sm">État</span>
                  <StatusBadge
                    status={
                      job.conversation.isLocked ? "Verrouillée" : "Active"
                    }
                    colorClass={
                      job.conversation.isLocked
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }
                  />
                </div>
              </div>
            ) : (
              <p className="text-neutral-400 italic text-sm">
                Pas de conversation
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
