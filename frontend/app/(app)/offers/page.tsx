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
  Search,
  ArrowRight,
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
/*  StatCard — Enhanced Stat with colored icon circle                          */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
  valueColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor: string;
  valueColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-200 group">
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColor} transition-transform group-hover:scale-110`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className={`text-2xl font-bold ${valueColor} tracking-tight`}>
        {value}
      </p>
    </div>
  );
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
      <div className="p-6 lg:p-8 max-w-4xl mx-auto text-center py-20">
        <div className="w-20 h-20 bg-brand-600/5 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <FileText className="w-10 h-10 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Offres reçues
        </h1>
        <p className="text-neutral-500 max-w-md mx-auto">
          Consultez les offres reçues dans chaque annonce de votre espace « Mes
          Transports ».
        </p>
        <a
          href="/jobs"
          className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-white bg-accent-500 hover:bg-accent-600 px-5 py-2.5 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5"
        >
          Voir mes annonces
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  // Loading state (initial only)
  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Mes offres
          </h1>
          <p className="text-neutral-500 mt-1">Chargement...</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="w-16 h-16 bg-brand-600/5 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
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
  const potentialEarnings = offers
    .filter((o) => o.status === "PENDING")
    .reduce((sum, o) => sum + o.price * (1 - o.commission_rate), 0);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Mes offres
          </h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Suivez l&apos;état de vos offres soumises et gérez vos propositions.
          </p>
        </div>
        <button
          onClick={() => fetchOffers()}
          disabled={refreshing}
          className="p-2.5 text-neutral-400 hover:text-brand-600 hover:bg-brand-600/5 rounded-xl transition-all disabled:opacity-50 group"
          title="Rafraîchir"
        >
          <RefreshCw
            className={`w-5 h-5 group-hover:rotate-180 transition-transform duration-500 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Stats Grid — Enhanced V2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={FileText}
          label="Total"
          value={String(offers.length)}
          iconColor="bg-brand-600/10 text-brand-600"
          valueColor="text-neutral-900"
        />
        <StatCard
          icon={Clock}
          label="En attente"
          value={String(pendingCount)}
          iconColor="bg-amber-100 text-amber-600"
          valueColor="text-amber-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Taux accept."
          value={acceptanceRate === -1 ? "—" : `${acceptanceRate}%`}
          iconColor="bg-emerald-100 text-emerald-600"
          valueColor="text-emerald-600"
        />
        <StatCard
          icon={DollarSign}
          label="Gain potentiel"
          value={`${potentialEarnings.toFixed(0)} TND`}
          iconColor="bg-brand-600/10 text-brand-600"
          valueColor="text-brand-600"
        />
      </div>

      {/* Tabs — Enhanced V2 with icon + count pill */}
      <div className="flex gap-1 bg-brand-600/[0.03] rounded-2xl p-1.5 mb-6 overflow-x-auto">
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
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-white text-brand-600 shadow-sm ring-1 ring-brand-600/10"
                  : "text-neutral-500 hover:text-neutral-700 hover:bg-white/50"
              }`}
            >
              <tab.icon
                className={`w-4 h-4 ${isActive ? "text-brand-600" : ""}`}
              />
              {tab.label}
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive
                    ? "bg-accent-500/10 text-accent-600"
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
          <div className="text-center py-20 bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-accent-500/10 rounded-2xl rotate-6" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Search className="w-10 h-10 text-brand-600 -rotate-6" />
              </div>
            </div>
            <p className="text-neutral-700 font-semibold mb-1">
              Aucune offre{" "}
              {activeTab !== "ALL"
                ? `${TABS.find((t) => t.id === activeTab)?.label.toLowerCase()}`
                : ""}{" "}
              pour le moment.
            </p>
            <p className="text-sm text-neutral-400 max-w-md mx-auto">
              Parcourez les missions disponibles pour soumettre vos offres.
            </p>
            {/* FIX #1: /search → /jobs/browse */}
            <a
              href="/jobs/browse"
              className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-white bg-accent-500 hover:bg-accent-600 px-5 py-2.5 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              Trouver une mission
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        ) : (
          filtered.map((offer, index) => (
            <div
              key={offer.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <OfferStatusCard
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
