"use client";

import React from "react";
import {
  Truck,
  Package,
  MapPin,
  Calendar,
  User,
  Star,
  ShieldCheck,
} from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import { formatDate, formatTND } from "@/lib/format";

interface OfferInfo {
  id: number;
  total_price: number;
  commission_rate: number;
  transporter_name: string;
  transporter_rating?: number;
  trust_badge?: string;
  message?: string;
}

interface JobInfo {
  id: number;
  job_type: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_time: string;
  specifications?: Record<string, any>;
}

interface Props {
  job: JobInfo;
  offer: OfferInfo;
}

export function BookingSummary({ job, offer }: Props) {
  const { t } = useAppI18n();
  const commissionAmount = offer.total_price * (offer.commission_rate || 0.15);
  const netPrice = offer.total_price - commissionAmount;

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
        <h3 className="text-lg font-semibold text-neutral-900">
          {t.booking.orderSummary}
        </h3>
      </div>

      {/* Job Info */}
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              job.job_type === "TRANSPORT"
                ? "bg-brand-600/5 text-brand-600"
                : "bg-purple-50 text-purple-600"
            }`}
          >
            {job.job_type === "TRANSPORT" ? (
              <Truck className="w-5 h-5" />
            ) : (
              <Package className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">
              {job.job_type === "TRANSPORT"
                ? t.booking.jobTypeTransport
                : t.booking.jobTypeMoving}
            </p>
            <p className="text-xs text-neutral-500">
              {interpolate(t.booking.orderNumberShort, { id: job.id })}
            </p>
          </div>
        </div>

        {/* Route */}
        <div className="bg-neutral-50 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-neutral-500">{t.booking.departure}</p>
              <p className="text-sm font-medium text-neutral-900">
                {job.pickup_address}
              </p>
            </div>
          </div>
          <div className="ms-3 border-s-2 border-dashed border-neutral-200 h-4" />
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-3 h-3 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-neutral-500">{t.booking.destination}</p>
              <p className="text-sm font-medium text-neutral-900">
                {job.dropoff_address}
              </p>
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-neutral-400" />
          <p className="text-sm text-neutral-700">
            {formatDate(job.scheduled_time, undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <hr className="border-neutral-100" />

        {/* Transporter Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
            <User className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-neutral-900">
                {offer.transporter_name}
              </p>
              {offer.trust_badge === "VERIFIED" && (
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              )}
            </div>
            {offer.transporter_rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <span className="text-xs text-neutral-500">
                  {offer.transporter_rating}/5
                </span>
              </div>
            )}
          </div>
        </div>

        <hr className="border-neutral-100" />

        {/* Price Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">{t.booking.transportPrice}</span>
            <span className="text-neutral-900 font-medium">
              {formatTND(offer.total_price)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">
              {interpolate(t.booking.platformFeePct, {
                rate: ((offer.commission_rate || 0.15) * 100).toFixed(0),
              })}
            </span>
            <span className="text-neutral-500">{t.booking.feeIncluded}</span>
          </div>
          <hr className="border-neutral-100" />
          <div className="flex justify-between text-base font-semibold">
            <span className="text-neutral-900">{t.booking.totalPay}</span>
            <span className="text-brand-600">
              {formatTND(offer.total_price)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
