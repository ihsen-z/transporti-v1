"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { apiClient, ApiError } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import { OfferStatusCard } from "@/components/offers/OfferStatusCard";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Pagination, { paginateArray } from "@/components/ui/Pagination";
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
  Wallet,
} from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

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
  price_net: number;
  commission_amount: number;
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

const TABS = [
  { id: "ALL", labelKey: "tabsAll", icon: FileText },
  { id: "PENDING", labelKey: "tabsPending", icon: Clock },
  { id: "ACCEPTED", labelKey: "tabsAccepted", icon: CheckCircle },
  { id: "REJECTED", labelKey: "tabsRejected", icon: XCircle },
  { id: "EXPIRED", labelKey: "tabsExpired", icon: AlertCircle },
  { id: "WITHDRAWN", labelKey: "tabsWithdrawn", icon: Undo2 },
] as const;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function mapApiOffer(o: ApiOffer): MappedOffer {
  const totalPrice = parseFloat(o.total_price) || 0;
  const priceNet = parseFloat(o.price_net) || 0;
  const commissionAmount = parseFloat(o.commission_amount) || 0;
  const commissionRate = totalPrice > 0 ? commissionAmount / totalPrice : 0;

  // Determine job type
  let jobType: MappedOffer["job_type"] = "TRANSPORT";
  if (o.job_type === "MOVING") jobType = "MOVING";
  else if (o.job_type === "DELIVERY") jobType = "DELIVERY";

  // FIX #3: Auto-detect expired offers on frontend
  let status = o.status as MappedOffer["status"];
  if (status === "PENDING" && o.valid_until) {
    const deadline = new Date(o.valid_until);
    if (deadline.getTime() < Date.now()) {
      status = "EXPIRED";
    }
  }

  return {
    id: o.id,
    job_id: o.job,
    job_pickup: o.job_pickup || "—",
    job_dropoff: o.job_dropoff || "—",
    job_type: jobType,
    job_date: o.job_date || o.created_at,
    price: totalPrice,
    // FIX #5: Map price_net and commission_amount directly from API
    price_net: priceNet,
    commission_amount: commissionAmount,
    commission_rate: commissionRate,
    status,
    valid_until: o.valid_until,
    message: o.message || undefined,
    client_name: o.client_name || undefined,
  };
}

/** Truncate a long address to city-level for display */
function shortAddress(addr: string, maxLen = 40): string {
  if (!addr || addr === "—") return addr;
  if (addr.length <= maxLen) return addr;
  const parts = addr.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    const short = `${parts[0]}, ${parts[1]}`;
    if (short.length <= maxLen) return short;
    return parts[0].length <= maxLen ? parts[0] : addr.slice(0, maxLen) + "…";
  }
  return addr.slice(0, maxLen) + "…";
}

/* -------------------------------------------------------------------------- */
/*  StatCard — Enhanced with premium visual hierarchy                          */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
  valueColor,
  highlight = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor: string;
  valueColor: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-200 group ${
        highlight
          ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-200"
          : "bg-white border-neutral-100"
      }`}
    >
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

const POLL_INTERVAL_MS = 30_000;

export default function MyOffersPage() {
  const { t } = useAppI18n();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");
  const [offers, setOffers] = useState<MappedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [offerPage, setOfferPage] = useState(1);
  const OFFER_PAGE_SIZE = 10;

  // FIX #1: Modal state instead of native confirm()
  const [withdrawTarget, setWithdrawTarget] = useState<MappedOffer | null>(
    null,
  );
  const [withdrawing, setWithdrawing] = useState(false);

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
      } catch (e: unknown) {
        console.error("Failed to fetch offers:", e);
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
      pollRef.current = setInterval(() => fetchOffers(true), POLL_INTERVAL_MS);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    } else {
      setLoading(false);
    }
  }, [role, fetchOffers]);

  // Reset page when tab changes — must be before early returns
  useEffect(() => {
    setOfferPage(1);
  }, [activeTab]);

  /* ── Withdraw — FIX #1: modal-based + FIX #2: parse error body ── */
  const handleWithdrawRequest = (offer: MappedOffer) => {
    setWithdrawTarget(offer);
  };

  const handleWithdrawConfirm = async () => {
    if (!withdrawTarget) return;
    setWithdrawing(true);
    try {
      await apiClient.post(`/api/offers/${withdrawTarget.id}/withdraw/`, {});
      showToast("success", "Offre retirée avec succès.");
      setWithdrawTarget(null);
      await fetchOffers();
    } catch (e: unknown) {
      // FIX #2: Parse backend error body for meaningful messages
      let msg = "Impossible de retirer cette offre.";
      if (e instanceof ApiError) {
        if (e.body?.error) {
          msg = String(e.body.error);
        } else if (e.status === 400) {
          msg = "Cette offre ne peut plus être retirée.";
        } else if (e.status >= 500) {
          msg = "Erreur serveur. Veuillez réessayer.";
        }
      } else if (e instanceof TypeError) {
        msg = "Erreur réseau. Vérifiez votre connexion.";
      }
      showToast("error", msg);
    } finally {
      setWithdrawing(false);
    }
  };

  const handleWithdrawCancel = () => {
    if (!withdrawing) setWithdrawTarget(null);
  };

  // Clients see a different view
  if (role === "CLIENT") {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto text-center py-20">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 mb-1">
          {t.offers.emptyStateTitle}
        </h3>
        <p className="text-neutral-500 mb-6 max-w-sm mx-auto">
          {t.offers.emptyStateDesc}
        </p>
        <Link
          href="/jobs/browse"
          className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-700 transition-colors shadow-sm"
        >
          <Search className="w-5 h-5" />
          {t.offers.emptyStateFind}
        </Link>
      </div>
    );
  }

  // Loading state
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

  const paginatedOffers = paginateArray(filtered, offerPage, OFFER_PAGE_SIZE);

  // Stats
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
          : 0;

  // FIX #5: Use price_net directly from API
  const potentialEarnings = offers
    .filter((o) => o.status === "PENDING")
    .reduce((sum, o) => sum + o.price_net, 0);

  // FIX #6: Confirmed earnings from accepted offers
  const confirmedEarnings = offers
    .filter((o) => o.status === "ACCEPTED")
    .reduce((sum, o) => sum + o.price_net, 0);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* FIX #1: Premium Confirm Modal */}
      <ConfirmModal
        open={!!withdrawTarget}
        onCancel={() => setWithdrawTarget(null)}
        onConfirm={handleWithdrawConfirm}
        title={t.offers.confirmWithdrawTitle}
        message={t.offers.confirmWithdrawDesc}
        confirmLabel={t.offers.actionWithdraw}
        cancelLabel={t.common.cancel}
        confirmColor="red"
        loading={withdrawing}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            {t.offers.title}
          </h1>
          <p className="text-neutral-500 max-w-2xl">
            {t.offers.subtitle}
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

      {/* Stats Grid — FIX #6: 5 stats with confirmed earnings highlighted */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={TrendingUp}
          label={t.offers.statsActive}
          value={String(offers.length)}
          iconColor="bg-blue-50 text-blue-600"
          valueColor="text-blue-700"
        />
        <StatCard
          icon={CheckCircle}
          label={t.offers.statsAccepted}
          value={String(acceptedCount)}
          iconColor="bg-emerald-50 text-emerald-600"
          valueColor="text-emerald-700"
          highlight
        />
        <StatCard
          icon={DollarSign}
          label={t.offers.statsEarnings}
          value={`${potentialEarnings.toLocaleString()} TND`}
          iconColor="bg-amber-50 text-amber-600"
          valueColor="text-amber-700"
        />
      </div>

      {/* Tabs — FIX #9: Show all tabs even when count=0 */}
      <div className="flex gap-1 bg-brand-600/[0.03] rounded-2xl p-1.5 mb-6 overflow-x-auto">
        {TABS.map((tab) => {
          const count =
            tab.id === "ALL"
              ? offers.length
              : offers.filter((o) => o.status === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabFilter);
                setOfferPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {t.offers[tab.labelKey as keyof typeof t.offers]}
              <span
                className={`ml-1.5 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.id
                    ? "bg-brand-100 text-brand-700"
                    : "bg-neutral-100 text-neutral-600"
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
              {t.offers.emptyStateTitle}
            </p>
            <p className="text-sm text-neutral-400 max-w-md mx-auto">
              {t.offers.emptyStateDesc}
            </p>
            <Link
              href="/jobs/browse"
              className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-white bg-accent-500 hover:bg-accent-600 px-5 py-2.5 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              {t.offers.emptyStateFind}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          paginatedOffers.map((offer, index) => (
            <div
              key={offer.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <OfferStatusCard
                offer={{
                  ...offer,
                  job_pickup: shortAddress(offer.job_pickup),
                  job_dropoff: shortAddress(offer.job_dropoff),
                }}
                fullPickup={offer.job_pickup}
                fullDropoff={offer.job_dropoff}
                onWithdraw={() => handleWithdrawRequest(offer)}
                isWithdrawing={withdrawing && withdrawTarget?.id === offer.id}
              />
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={offerPage}
        totalItems={filtered.length}
        pageSize={OFFER_PAGE_SIZE}
        onPageChange={setOfferPage}
      />
    </div>
  );
}
