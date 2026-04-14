import React from "react";
import Link from "next/link";
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
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  OfferStatusCard — Premium card for transporter's offer tracking (V2)      */
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
    commission_rate: number;
    status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "WITHDRAWN";
    valid_until: string;
    message?: string;
    client_name?: string;
  };
  /** Full un-truncated addresses for tooltip */
  fullPickup?: string;
  fullDropoff?: string;
  onWithdraw?: (offerId: number) => void;
  isWithdrawing?: boolean;
}

const STATUS_CONFIG = {
  PENDING: {
    label: "En attente",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400",
    borderAccent: "border-l-amber-400",
    icon: Clock,
  },
  ACCEPTED: {
    label: "Acceptée",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-500",
    borderAccent: "border-l-emerald-500",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Refusée",
    color: "bg-red-50 text-red-700 border-red-200",
    dotColor: "bg-red-400",
    borderAccent: "border-l-red-400",
    icon: XCircle,
  },
  EXPIRED: {
    label: "Expirée",
    color: "bg-neutral-100 text-neutral-500 border-neutral-200",
    dotColor: "bg-neutral-400",
    borderAccent: "border-l-neutral-300",
    icon: AlertCircle,
  },
  WITHDRAWN: {
    label: "Retirée",
    color: "bg-neutral-100 text-neutral-500 border-neutral-200",
    dotColor: "bg-neutral-400",
    borderAccent: "border-l-neutral-300",
    icon: Undo2,
  },
};

// FIX #6 + #15: Job type config with icons and colors
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

export function OfferStatusCard({
  offer,
  fullPickup,
  fullDropoff,
  onWithdraw,
  isWithdrawing,
}: OfferStatusCardProps) {
  const config = STATUS_CONFIG[offer.status];
  const StatusIcon = config.icon;
  const typeConfig =
    JOB_TYPE_CONFIG[offer.job_type] || JOB_TYPE_CONFIG.TRANSPORT;
  const TypeIcon = typeConfig.icon;

  // FIX #4: price is now total_price, so commission + net are derived correctly
  const commissionAmount = offer.price * offer.commission_rate;
  const netEarning = offer.price - commissionAmount;

  // Countdown for pending offers
  const deadline = new Date(offer.valid_until);
  const now = new Date();
  const hoursLeft = Math.max(
    0,
    Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)),
  );
  const isUrgent = hoursLeft < 6 && offer.status === "PENDING";
  const isMuted =
    offer.status === "REJECTED" ||
    offer.status === "EXPIRED" ||
    offer.status === "WITHDRAWN";

  return (
    <div
      className={`
        group bg-white rounded-2xl border border-l-[3px] transition-all duration-200
        ${config.borderAccent}
        ${
          offer.status === "ACCEPTED"
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
            <ArrowRight className="w-3.5 h-3.5 text-neutral-300 flex-shrink-0" />
            <span className="truncate font-medium">{offer.job_dropoff}</span>
          </div>

          {/* Meta: Date + Type */}
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(offer.job_date).toLocaleDateString("fr-TN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            {/* FIX #6 + #15: Enhanced type badge with icon */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${typeConfig.className}`}
            >
              <TypeIcon className="w-3 h-3" />
              {typeConfig.label}
            </span>
            {offer.client_name && offer.status !== "ACCEPTED" && (
              <span className="text-neutral-400">pour {offer.client_name}</span>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border flex-shrink-0 ${config.color}`}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          {config.label}
        </span>
      </div>

      {/* FIX #10: Show transporter's message if present */}
      {offer.message && (
        <div className="flex items-start gap-2 mb-3 px-3 py-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
          <MessageCircle className="w-3.5 h-3.5 text-neutral-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-neutral-500 line-clamp-2 italic leading-relaxed">
            &ldquo;{offer.message}&rdquo;
          </p>
        </div>
      )}

      {/* Price breakdown — Enhanced V2 with icons and visual separation */}
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

          {/* Divider */}
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
          {offer.status === "PENDING" && (
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
          {/* FIX #19: Show client name for accepted offers */}
          {offer.status === "ACCEPTED" && offer.client_name && (
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
              <CheckCircle className="w-3.5 h-3.5" />
              Client : {offer.client_name}
            </div>
          )}
        </div>

        {/* Action Buttons — Ghost style */}
        <div className="flex gap-1.5">
          <Link
            href={`/jobs/${offer.job_id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-white hover:bg-brand-600 px-3 py-1.5 rounded-lg transition-all duration-200 border border-brand-600/20 hover:border-brand-600"
          >
            <Eye className="w-3.5 h-3.5" />
            Voir
          </Link>
          {offer.status === "PENDING" && onWithdraw && (
            <button
              onClick={() => onWithdraw(offer.id)}
              disabled={isWithdrawing}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 border ${
                isWithdrawing
                  ? "text-neutral-400 border-neutral-200 cursor-not-allowed"
                  : "text-red-500 border-red-200 hover:text-white hover:bg-red-500 hover:border-red-500"
              }`}
            >
              <Undo2
                className={`w-3.5 h-3.5 ${isWithdrawing ? "animate-spin" : ""}`}
              />
              {isWithdrawing ? "..." : "Retirer"}
            </button>
          )}
          {/* FIX #3: Link to messages inbox (conversation is created on accept) */}
          {offer.status === "ACCEPTED" && (
            <Link
              href={`/messages/${offer.job_id}`}
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
