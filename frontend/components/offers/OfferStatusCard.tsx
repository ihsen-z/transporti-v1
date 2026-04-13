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
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  OfferStatusCard — Rich card for transporter's offer tracking              */
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
    icon: Clock,
  },
  ACCEPTED: {
    label: "Acceptée",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Refusée",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
  EXPIRED: {
    label: "Expirée",
    color: "bg-neutral-100 text-neutral-500 border-neutral-200",
    icon: AlertCircle,
  },
  WITHDRAWN: {
    label: "Retirée",
    color: "bg-neutral-100 text-neutral-500 border-neutral-200",
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

  return (
    <div
      className={`bg-white rounded-xl border ${
        offer.status === "ACCEPTED"
          ? "border-emerald-200 shadow-emerald-50"
          : offer.status === "WITHDRAWN"
            ? "border-neutral-200 opacity-75"
            : "border-neutral-200"
      } p-5 hover:shadow-sm transition-shadow`}
    >
      {/* Header: Route + Status */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div
            className="flex items-center gap-2 text-sm text-neutral-600 mb-1"
            title={
              fullPickup && fullDropoff
                ? `${fullPickup} → ${fullDropoff}`
                : undefined
            }
          >
            <MapPin className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
            <span className="truncate">{offer.job_pickup}</span>
            <span className="text-neutral-400 flex-shrink-0">→</span>
            <span className="truncate">{offer.job_dropoff}</span>
          </div>
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
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${typeConfig.className}`}
            >
              <TypeIcon className="w-3 h-3" />
              {typeConfig.label}
            </span>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${config.color}`}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          {config.label}
        </span>
      </div>

      {/* FIX #10: Show transporter's message if present */}
      {offer.message && (
        <div className="flex items-start gap-2 mb-3 px-3 py-2 bg-neutral-50 rounded-lg">
          <MessageCircle className="w-3.5 h-3.5 text-neutral-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-neutral-500 line-clamp-2 italic">
            &ldquo;{offer.message}&rdquo;
          </p>
        </div>
      )}

      {/* Price breakdown — FIX #4: Now correctly showing total_price as "Prix proposé" */}
      <div className="bg-neutral-50 rounded-lg p-3 grid grid-cols-3 gap-3 text-center mb-3">
        <div>
          <p className="text-xs text-neutral-400">Prix proposé</p>
          <p className="text-sm font-semibold text-neutral-900">
            {offer.price.toFixed(0)} TND
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">
            Commission ({(offer.commission_rate * 100).toFixed(0)}%)
          </p>
          <p className="text-sm font-medium text-red-500">
            -{commissionAmount.toFixed(0)} TND
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-400">Gain net</p>
          <p className="text-sm font-bold text-emerald-600">
            {netEarning.toFixed(0)} TND
          </p>
        </div>
      </div>

      {/* Countdown / Client info / Actions */}
      <div className="flex items-center justify-between">
        <div>
          {offer.status === "PENDING" && (
            <p
              className={`text-xs flex items-center gap-1 ${isUrgent ? "text-red-500 font-medium" : "text-neutral-400"}`}
            >
              <Clock className="w-3.5 h-3.5" />
              {hoursLeft > 0
                ? `Expire dans ${hoursLeft}h`
                : "Expiration imminente"}
            </p>
          )}
          {/* FIX #19: Show client name for accepted offers */}
          {offer.status === "ACCEPTED" && offer.client_name && (
            <p className="text-xs text-emerald-600 font-medium">
              Client : {offer.client_name}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            href={`/jobs/${offer.job_id}`}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Voir le job
          </Link>
          {offer.status === "PENDING" && onWithdraw && (
            <button
              onClick={() => onWithdraw(offer.id)}
              disabled={isWithdrawing}
              className={`text-xs font-medium flex items-center gap-1 transition-colors ${
                isWithdrawing
                  ? "text-neutral-400 cursor-not-allowed"
                  : "text-red-500 hover:text-red-700"
              }`}
            >
              <Undo2
                className={`w-3.5 h-3.5 ${isWithdrawing ? "animate-spin" : ""}`}
              />
              {isWithdrawing ? "Retrait..." : "Retirer"}
            </button>
          )}
          {/* FIX #3: Link to messages inbox (conversation is created on accept) */}
          {offer.status === "ACCEPTED" && (
            <Link
              href={`/messages/${offer.job_id}`}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-800 flex items-center gap-1 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Contacter le client
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
