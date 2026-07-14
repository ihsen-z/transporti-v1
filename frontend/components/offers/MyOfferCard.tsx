import React, { useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Clock,
  XCircle,
  CheckCircle,
  Undo2,
  ArrowRight,
  Info,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/client";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { formatTND, formatDateTime } from "@/lib/format";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";

export interface MyOffer {
  id: number;
  status: string;
  price_net: number;
  commission_amount: number;
  total_price: number;
  message?: string | null;
  valid_until?: string | null;
  created_at?: string;
}

interface MyOfferCardProps {
  offer: MyOffer;
  /** Called after a successful withdraw so the parent can refetch the job. */
  onChanged: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-neutral-200 text-neutral-600",
  WITHDRAWN: "bg-neutral-200 text-neutral-600",
};

export function MyOfferCard({ offer, onChanged }: MyOfferCardProps) {
  const { t: allT } = useAppI18n();
  const t = allT.myOfferCard;
  const { showToast } = useToast();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const statusLabels: Record<string, string> = {
    PENDING: t.statusPending,
    ACCEPTED: t.statusAccepted,
    REJECTED: t.statusRejected,
    EXPIRED: t.statusExpired,
    WITHDRAWN: t.statusWithdrawn,
  };

  const StatusIcon =
    offer.status === "ACCEPTED"
      ? CheckCircle
      : offer.status === "PENDING"
        ? Clock
        : XCircle;

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      await apiClient.post(`/api/offers/${offer.id}/withdraw/`, {});
      showToast("success", t.withdrawSuccess);
      setConfirmOpen(false);
      onChanged();
    } catch (e: unknown) {
      let msg: string = t.withdrawError;
      if (e instanceof ApiError && e.body) {
        const detail =
          (e.body as { error?: string; detail?: string }).error ||
          (e.body as { error?: string; detail?: string }).detail;
        if (detail) msg = detail;
      }
      showToast("error", msg);
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm">
      <ConfirmModal
        open={confirmOpen}
        onCancel={() => !withdrawing && setConfirmOpen(false)}
        onConfirm={handleWithdraw}
        title={allT.offers.confirmWithdrawTitle}
        message={allT.offers.confirmWithdrawDesc}
        confirmLabel={allT.offers.actionWithdraw}
        loading={withdrawing}
      />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <BadgeCheck className="w-5 h-5 text-brand-600" />
          {t.title}
        </h3>
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
            STATUS_STYLES[offer.status] || "bg-neutral-100 text-neutral-600"
          }`}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          {statusLabels[offer.status] || offer.status}
        </span>
      </div>

      {/* Amounts — read from stored values, no client-side formula */}
      <div className="bg-neutral-50 rounded-lg p-4 space-y-2 text-sm mb-4">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-neutral-900">{t.yourNet}</span>
          <span className="font-bold text-xl text-brand-600">
            {formatTND(offer.price_net)}
          </span>
        </div>
        <div className="flex justify-between text-neutral-600">
          <span>{t.commission}</span>
          <span>{formatTND(offer.commission_amount)}</span>
        </div>
        <div className="flex justify-between text-neutral-600 pt-2 border-t border-neutral-200">
          <span>{t.clientTotal}</span>
          <span className="font-semibold">{formatTND(offer.total_price)}</span>
        </div>
      </div>

      {offer.message && (
        <p className="text-sm text-neutral-600 italic border-s-2 border-neutral-200 ps-3 mb-4">
          &ldquo;{offer.message}&rdquo;
        </p>
      )}

      {offer.status === "PENDING" && offer.valid_until && (
        <p className="text-xs text-neutral-400 mb-4 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {t.expiresOn} {formatDateTime(offer.valid_until)}
        </p>
      )}

      {/* The backend forbids re-submission whatever the status — say it. */}
      {offer.status !== "PENDING" && offer.status !== "ACCEPTED" && (
        <div className="mb-4 p-3 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex items-start gap-2 text-sm">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{t.resubmitNotAllowed}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {offer.status === "PENDING" && (
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={withdrawing}
            className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <Undo2 className="w-4 h-4" />
            {allT.offers.actionWithdraw}
          </button>
        )}
        <Link
          href="/offers"
          className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-200 transition-colors"
        >
          {t.viewMyOffers}
          <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
        </Link>
      </div>
    </div>
  );
}
