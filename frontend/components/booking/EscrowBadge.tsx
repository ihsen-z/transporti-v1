"use client";

import React from "react";
import { ShieldCheck, Lock, Clock } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";

interface Props {
  paymentMethod: "DIGITAL" | "COD";
  totalPrice: number;
}

export function EscrowBadge({ paymentMethod, totalPrice }: Props) {
  const { t } = useAppI18n();
  if (paymentMethod !== "DIGITAL") return null;

  return (
    <div
      data-testid="reservation-escrow-explication"
      className="bg-green-50 rounded-tile p-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-green-900">
            {t.booking.escrowBadgeTitle}
          </p>
          <p className="text-xs text-green-700">
            {interpolate(t.booking.escrowBadgeAmount, {
              amount: totalPrice.toFixed(2),
            })}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-green-500" />
          <span className="text-xs text-green-800">
            {t.booking.escrowFundsLocked}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-green-500" />
          <span className="text-xs text-green-800">
            {t.booking.escrowAutoRelease}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
          <span className="text-xs text-green-800">
            {t.booking.escrowRefundGuarantee}
          </span>
        </div>
      </div>
    </div>
  );
}
