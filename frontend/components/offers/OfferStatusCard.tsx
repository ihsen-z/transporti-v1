import React from "react";
import Link from "next/link";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Undo2,
  MapPin,
  Calendar,
  Package,
  Truck,
  Home,
  MessageCircle,
  ArrowRight,
  Banknote,
  Percent,
  Wallet,
  Loader2,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  OfferStatusCard — Premium card for transporter's offer tracking (V3)      */
/*  Fixes: #3 expired visual, #4 contacter link, #5 price_net direct          */
/* -------------------------------------------------------------------------- */

interface OfferStatusCardProps {
  offer: {
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
  };
  /** Full un-truncated addresses for tooltip */
  fullPickup?: string;
  fullDropoff?: string;
  /** FIX #1: Now called without offerId — parent manages the modal target */
  onWithdraw?: () => void;
  isWithdrawing?: boolean;
}

const STATUS_CONFIG = {
  PENDING: {
    label: "En attente",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400",
    borderAccent: "border-s-amber-400",
    icon: Clock,
  },
  ACCEPTED: {
    label: "Acceptée",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-500",
    borderAccent: "border-s-emerald-500",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Refusée",
    color: "bg-red-50 text-red-700 border-red-200",
    dotColor: "bg-red-400",
    borderAccent: "border-s-red-400",
    icon: XCircle,
  },
  EXPIRED: {
    label: "Expirée",
    color: "bg-neutral-100 text-neutral-500 border-neutral-200",
    dotColor: "bg-neutral-400",
    borderAccent: "border-s-neutral-300",
    icon: AlertCircle,
  },
  WITHDRAWN: {
    label: "Retirée",
    color: "bg-neutral-100 text-neutral-500 border-neutral-200",
    dotColor: "bg-neutral-400",
    borderAccent: "border-s-neutral-300",
    icon: Undo2,
  },
};

const JOB_TYPE_CONFIG = {
  TRANSPORT: {
    label: "Transport",
    icon: Truck,
    className: "bg-brand-600/5 text-brand-600",
  },
  MOVING: {
    label: "Déménagement",
    icon: Home,
    className: "bg-purple-50 text-purple-600",
  },
  DELIVERY: {
    label: "Livraison",
    icon: Package,
    className: "bg-sky-50 text-sky-600",
  },
};

function OfferStatusCardInner({
  offer,
  fullPickup,
  fullDropoff,
  onWithdraw,
  isWithdrawing,
}: OfferStatusCardProps) {
  const { locale } = useAppI18n();
  const dateLocale = locale === "ar" ? "ar-TN" : "fr-TN";

  const config = STATUS_CONFIG[offer.status];
  const StatusIcon = config.icon;
  const typeConfig =
    JOB_TYPE_CONFIG[offer.job_type] || JOB_TYPE_CONFIG.TRANSPORT;
  const TypeIcon = typeConfig.icon;

  // FIX #5: Use price_net and commission_amount directly from API
  const commissionAmount = offer.commission_amount;
  const netEarning = offer.price_net;

  // Countdown for pending offers
  const deadline = new Date(offer.valid_until);
  const now = new Date();
  const msLeft = deadline.getTime() - now.getTime();
  const hoursLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60)));
  const isUrgent = hoursLeft < 6 && offer.status === "PENDING";
  // FIX #3: Also detect if offer has expired but status wasn't updated yet
  const isExpiredLocally = offer.status === "PENDING" && msLeft <= 0;
  const effectiveStatus = isExpiredLocally ? "EXPIRED" : offer.status;
  const effectiveConfig = isExpiredLocally
    ? STATUS_CONFIG.EXPIRED
    : STATUS_CONFIG[offer.status];
  const EffectiveIcon = effectiveConfig.icon;

  const isMuted =
    effectiveStatus === "REJECTED" ||
    effectiveStatus === "EXPIRED" ||
    effectiveStatus === "WITHDRAWN";

  return (
    <div
      className={`
        group bg-white rounded-2xl border border-s-[3px] transition-all duration-200
        ${effectiveConfig.borderAccent}
        ${
          effectiveStatus === "ACCEPTED"
            ? "border-emerald-200 shadow-sm shadow-emerald-50 hover:shadow-md hover:shadow-emerald-100/50"
            : isMuted
              ? "border-neutral-200 opacity-70 hover:opacity-100"
              : "border-neutral-100 hover:shadow-md hover:-translate-y-0.5"
        }
        p-5
      `}
    >
      {/* Header: Route + Status */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          {/* Route */}
          <div
            className="flex items-center gap-2 text-sm text-neutral-700 mb-1.5"
            title={
              fullPickup && fullDropoff
                ? `${fullPickup} → ${fullDropoff}`
                : undefined
            }
          >
            <MapPin className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span className="truncate font-medium">{offer.job_pickup}</span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-300 flex-shrink-0 rtl:-scale-x-100" />
            <span className="truncate font-medium">{offer.job_dropoff}</span>
          </div>

          {/* Meta: Date + Type */}
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(offer.job_date).toLocaleDateString(dateLocale, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeConfig.className}`}
            >
              <TypeIcon className="w-3 h-3" />
              {typeConfig.label}
            </span>
            {offer.client_name && effectiveStatus !== "ACCEPTED" && (
              <span className="text-neutral-400">pour {offer.client_name}</span>
            )}
          </div>
        </div>

        {/* Status Badge — FIX #3: use effective status for expired */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border flex-shrink-0 ${effectiveConfig.color}`}
        >
          <EffectiveIcon className="w-3.5 h-3.5" />
          {isExpiredLocally ? "Expirée" : effectiveConfig.label}
        </span>
      </div>

      {/* Show transporter's message if present */}
      {offer.message && (
        <div className="flex items-start gap-2 mb-3 px-3 py-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
          <MessageCircle className="w-3.5 h-3.5 text-neutral-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-neutral-500 line-clamp-2 italic leading-relaxed">
            &ldquo;{offer.message}&rdquo;
          </p>
        </div>
      )}

      {/* Price breakdown — FIX #5: use price_net and commission_amount directly */}
      <div className="bg-neutral-50 rounded-xl p-3.5 mb-3 border border-neutral-100">
        <div className="grid grid-cols-3 gap-3">
          {/* Prix proposé */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-neutral-400 mb-1">
              <Banknote className="w-3 h-3" />
              <p className="text-[10px] font-medium uppercase tracking-wider">
                Prix proposé
              </p>
            </div>
            <p className="text-sm font-bold text-neutral-900">
              {offer.price.toFixed(0)}{" "}
              <span className="text-xs font-medium text-neutral-500">TND</span>
            </p>
          </div>

          {/* Commission */}
          <div className="border-x border-neutral-200 text-center">
            <div className="flex items-center justify-center gap-1 text-neutral-400 mb-1">
              <Percent className="w-3 h-3" />
              <p className="text-[10px] font-medium uppercase tracking-wider">
                Commission
              </p>
            </div>
            <p className="text-sm font-semibold text-red-500">
              -{commissionAmount.toFixed(0)}{" "}
              <span className="text-xs font-normal">TND</span>
            </p>
          </div>

          {/* Gain net */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
              <Wallet className="w-3 h-3" />
              <p className="text-[10px] font-medium uppercase tracking-wider">
                Gain net
              </p>
            </div>
            <p className="text-sm font-bold text-emerald-600">
              {netEarning.toFixed(0)}{" "}
              <span className="text-xs font-medium">TND</span>
            </p>
          </div>
        </div>
      </div>

      {/* Footer: Countdown / Client info / Actions */}
      <div className="flex items-center justify-between">
        <div>
          {/* FIX #3: Show "Expirée" label for locally detected expired offers */}
          {effectiveStatus === "PENDING" && (
            <div
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg ${
                isUrgent
                  ? "text-red-600 bg-red-50 font-semibold"
                  : "text-amber-600 bg-amber-50 font-medium"
              }`}
            >
              <Clock
                className={`w-3.5 h-3.5 ${isUrgent ? "animate-pulse" : ""}`}
              />
              {hoursLeft > 0
                ? `Expire dans ${hoursLeft}h`
                : "Expiration imminente"}
            </div>
          )}
          {isExpiredLocally && (
            <div className="inline-flex items-center gap-1.5 text-xs text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-lg font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              Offre expirée
            </div>
          )}
          {effectiveStatus === "ACCEPTED" && offer.client_name && (
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5" />
              Client : {offer.client_name}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1.5">
          <Link
            href={`/jobs/${offer.job_id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-white hover:bg-brand-600 px-3 py-1.5 rounded-lg transition-all duration-200 border border-brand-600/20 hover:border-brand-600"
          >
            <Eye className="w-3.5 h-3.5" />
            Voir
          </Link>

          {/* Withdraw button — only for truly PENDING (not locally expired) */}
          {offer.status === "PENDING" && !isExpiredLocally && onWithdraw && (
            <button
              onClick={onWithdraw}
              disabled={isWithdrawing}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 border ${
                isWithdrawing
                  ? "text-neutral-400 border-neutral-200 cursor-not-allowed"
                  : "text-red-500 border-red-200 hover:text-white hover:bg-red-500 hover:border-red-500"
              }`}
            >
              {isWithdrawing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Undo2 className="w-3.5 h-3.5" />
              )}
              {isWithdrawing ? "…" : "Retirer"}
            </button>
          )}

          {/* FIX #4: Contacter link — always goes to messages inbox, not job-specific */}
          {effectiveStatus === "ACCEPTED" && (
            <Link
              href="/messages"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-white hover:bg-emerald-500 px-3 py-1.5 rounded-lg transition-all duration-200 border border-emerald-200 hover:border-emerald-500"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Contacter
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// Memoized: list re-rendered by 30s polling — skip unchanged cards
export const OfferStatusCard = React.memo(OfferStatusCardInner);
