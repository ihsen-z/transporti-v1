"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import { OfferStatusCard } from "@/components/offers/OfferStatusCard";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Loader2,
  RefreshCw,
  Undo2,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface ApiOffer {
  id: number;
  job: number;
  status: string;
  total_price: string;
  price_net: string;
  commission_amount: string;
  message: string;
  job_pickup: string;
  job_dropoff: string;
  job_type: string;
  job_date: string;
  client_name: string;
  valid_until: string;
  created_at: string;
}

export interface MappedOffer {
  id: number;
  job_id: number;
  job_pickup: string;
  job_dropoff: string;
  job_type: "TRANSPORT" | "MOVING" | "DELIVERY";
  job_date: string;
  price: number;
  commission_rate: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "WITHDRAWN";
  valid_until: string;
  message?: string;
  client_name?: string;
}

type TabFilter =
  | "ALL"
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "WITHDRAWN";

const TABS: { id: TabFilter; label: string; icon: React.ElementType }[] = [
  { id: "ALL", label: "Toutes", icon: FileText },
  { id: "PENDING", label: "En attente", icon: Clock },
  { id: "ACCEPTED", label: "Acceptées", icon: CheckCircle },
  { id: "REJECTED", label: "Refusées", icon: XCircle },
  { id: "EXPIRED", label: "Expirées", icon: AlertCircle },
  { id: "WITHDRAWN", label: "Retirées", icon: Undo2 },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function mapApiOffer(o: ApiOffer): MappedOffer {
  const totalPrice = parseFloat(o.total_price) || 0;
  const commissionAmount = parseFloat(o.commission_amount) || 0;
  const commissionRate = totalPrice > 0 ? commissionAmount / totalPrice : 0;

  // Determine job type — handle DELIVERY as a distinct type
  let jobType: MappedOffer["job_type"] = "TRANSPORT";
  if (o.job_type === "MOVING") jobType = "MOVING";
  else if (o.job_type === "DELIVERY") jobType = "DELIVERY";

  return {
    id: o.id,
    job_id: o.job,
    job_pickup: o.job_pickup || "—",
    job_dropoff: o.job_dropoff || "—",
    job_type: jobType,
    job_date: o.job_date || o.created_at,
    // FIX #4: Use total_price (what the client pays) as the "Prix proposé"
    price: totalPrice,
    commission_rate: commissionRate,
    status: o.status as MappedOffer["status"],
    valid_until: o.valid_until,
    message: o.message || undefined,
    client_name: o.client_name || undefined,
  };
}

/** Truncate a long address to city-level for display */
function shortAddress(addr: string, maxLen = 40): string {
  if (!addr || addr === "—") return addr;
  // If short enough, return as-is
  if (addr.length <= maxLen) return addr;
  // Try to cut at the first comma after a reasonable length
  const parts = addr.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    const short = `${parts[0]}, ${parts[1]}`;
    if (short.length <= maxLen) return short;
    return parts[0].length <= maxLen ? parts[0] : addr.slice(0, maxLen) + "…";
  }
  return addr.slice(0, maxLen) + "…";
}

/* -------------------------------------------------------------------------- */
/*  Page Component                                                            */
/* -------------------------------------------------------------------------- */

const POLL_INTERVAL_MS = 30_000; // Auto-refresh every 30s

export default function MyOffersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");
  const [offers, setOffers] = useState<MappedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const role = user?.role?.toUpperCase();

  /* ── Fetch offers from API ─────────────────────────────────── */
  const fetchOffers = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setRefreshing(true);
        const data = await apiClient.get<ApiOffer[] | { results: ApiOffer[] }>(
          "/api/offers/my/",
        );
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setOffers(list.map(mapApiOffer));
      } catch (e: any) {
        console.error("Failed to fetch offers:", e);
        // FIX #16: Show toast instead of replacing entire page with error
        if (!silent) {
          showToast("error", "Impossible de charger vos offres. Réessayez.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    if (role === "TRANSPORTER") {
      fetchOffers();
      // FIX #18: Auto-polling every 30s for live updates
      pollRef.current = setInterval(() => fetchOffers(true), POLL_INTERVAL_MS);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    } else {
      setLoading(false);
    }
  }, [role, fetchOffers]);

  /* ── Withdraw offer via API ────────────────────────────────── */
  const handleWithdraw = async (offerId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir retirer cette offre ?")) return;

    setWithdrawingId(offerId);
    try {
      await apiClient.post(`/api/offers/${offerId}/withdraw/`, {});
      showToast("success", "Offre retirée avec succès.");
      await fetchOffers();
    } catch (e: any) {
      console.error("Withdraw failed:", e);
      const msg =
        e?.message?.includes("400") || e?.status === 400
          ? "Cette offre ne peut plus être retirée."
          : "Impossible de retirer cette offre.";
      showToast("error", msg);
    } finally {
      setWithdrawingId(null);
    }
  };

  // Clients see a different view — redirect them to their jobs page
  if (role === "CLIENT") {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto text-center">
        <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Offres reçues
        </h1>
        <p className="text-neutral-500">
          Consultez les offres reçues dans chaque annonce de votre espace « Mes
          Transports ».
        </p>
        <a
          href="/jobs"
          className="inline-block mt-4 text-brand-600 hover:underline font-semibold"
        >
          Voir mes annonces →
        </a>
      </div>
    );
  }

  // Loading state (initial only)
  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">Mes offres</h1>
          <p className="text-neutral-500 mt-1">Chargement...</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        </div>
      </div>
    );
  }

  // Filter offers
  const filtered =
    activeTab === "ALL" ? offers : offers.filter((o) => o.status === activeTab);

  // Stats — FIX #17: Exclude PENDING from acceptance rate divisor
  const pendingCount = offers.filter((o) => o.status === "PENDING").length;
  const acceptedCount = offers.filter((o) => o.status === "ACCEPTED").length;
  const decidedOffers = offers.filter(
    (o) => o.status !== "PENDING" && o.status !== "WITHDRAWN",
  );
  const acceptanceRate =
    decidedOffers.length > 0
      ? Math.round((acceptedCount / decidedOffers.length) * 100)
      : offers.length === 0
        ? 0
        : pendingCount === offers.length
          ? -1
          : 0; // -1 = "En attente"

  // FIX #5: Gain potentiel = sum of price_net for PENDING offers
  // Since price is now total_price, gain = total - commission = total * (1 - rate)
  const potentialEarnings = offers
    .filter((o) => o.status === "PENDING")
    .reduce((sum, o) => sum + o.price * (1 - o.commission_rate), 0);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Mes offres</h1>
          <p className="text-neutral-500 mt-1">
            Suivez l&apos;état de vos offres soumises et gérez vos propositions.
          </p>
        </div>
        <button
          onClick={() => fetchOffers()}
          disabled={refreshing}
          className="p-2 text-neutral-400 hover:text-brand-600 hover:bg-brand-600/5 rounded-lg transition-colors disabled:opacity-50"
          title="Rafraîchir"
        >
          <RefreshCw
            className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-neutral-100 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-neutral-500 text-xs mb-1">
            <FileText className="w-3.5 h-3.5" />
            Total
          </div>
          <p className="text-2xl font-bold text-neutral-900">{offers.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-100 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-amber-500 text-xs mb-1">
            <Clock className="w-3.5 h-3.5" />
            En attente
          </div>
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-100 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-accent-500 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Taux acceptation
          </div>
          <p className="text-2xl font-bold text-accent-600">
            {acceptanceRate === -1 ? "—" : `${acceptanceRate}%`}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-100 p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 text-brand-600/60 text-xs mb-1">
            <DollarSign className="w-3.5 h-3.5" />
            Gain potentiel
          </div>
          <p className="text-2xl font-bold text-brand-600">
            {potentialEarnings.toFixed(0)} TND
          </p>
        </div>
      </div>

      {/* Tabs — FIX #7: Added WITHDRAWN tab */}
      <div className="flex gap-1 bg-brand-600/5 rounded-xl p-1 mb-6 overflow-x-auto">
        {TABS.map((tab) => {
          const count =
            tab.id === "ALL"
              ? offers.length
              : offers.filter((o) => o.status === tab.id).length;
          // Hide tabs with 0 items (except ALL and PENDING)
          if (
            count === 0 &&
            tab.id !== "ALL" &&
            tab.id !== "PENDING" &&
            tab.id !== "ACCEPTED"
          )
            return null;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? "bg-accent-50 text-accent-600"
                    : "bg-neutral-200/70 text-neutral-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Offer List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-neutral-100 shadow-sm">
            <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500 font-medium">
              Aucune offre{" "}
              {activeTab !== "ALL"
                ? `${TABS.find((t) => t.id === activeTab)?.label.toLowerCase()}`
                : ""}{" "}
              pour le moment.
            </p>
            <p className="text-sm text-neutral-400 mt-1">
              Parcourez les missions disponibles pour soumettre vos offres.
            </p>
            {/* FIX #1: /search → /jobs/browse */}
            <a
              href="/jobs/browse"
              className="inline-block mt-4 text-brand-600 hover:underline font-semibold text-sm"
            >
              Trouver une mission →
            </a>
          </div>
        ) : (
          filtered.map((offer) => (
            <OfferStatusCard
              key={offer.id}
              offer={{
                ...offer,
                // FIX #14: Truncate long addresses for readability
                job_pickup: shortAddress(offer.job_pickup),
                job_dropoff: shortAddress(offer.job_dropoff),
              }}
              fullPickup={offer.job_pickup}
              fullDropoff={offer.job_dropoff}
              onWithdraw={handleWithdraw}
              isWithdrawing={withdrawingId === offer.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
