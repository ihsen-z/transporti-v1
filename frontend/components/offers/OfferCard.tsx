"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  Star,
  ShieldCheck,
  CheckCircle,
  Truck,
  Clock,
  Award,
  TrendingUp,
  MessageCircle,
  ExternalLink,
  Shield,
  Handshake,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getMediaUrl } from "@/lib/imageUtils";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import type { JobOffer } from "@/lib/types/jobs";

interface OfferCardProps {
  offer: JobOffer;
  isOwner: boolean;
  onAccept: (offerId: number) => void;
}

export function OfferCard({ offer, isOwner, onAccept }: OfferCardProps) {
  const { t } = useAppI18n();
  const rating = offer.transporter_rating ?? 0;
  const jobsCount = offer.transporter_jobs_count ?? 0;
  const completionRate = offer.transporter_completion_rate ?? null;
  const isMovingSpecialist = offer.transporter_moving_specialist === true;
  const trustScore = offer.transporter_trust_score ?? null;
  const transporterId = offer.transporter_id;
  const codEligible = Number(offer.total_price ?? 0) <= 300;
  const hasWorkedTogether = offer.has_worked_together === true;
  const pastJobsCount = offer.past_jobs_count ?? 0;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-3 group">
      {/* Header: Avatar + Info + Price */}
      <div className="flex justify-between items-start gap-3">
        {/* Left: Avatar & Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <Link href={transporterId ? `/profile/${transporterId}` : "#"}>
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-neutral-200 group-hover:ring-brand-300 transition-colors cursor-pointer">
                {offer.transporter_avatar ? (
                  <Image
                    src={getMediaUrl(offer.transporter_avatar)}
                    alt={offer.transporter_name || t.offersComponents.transporterAlt}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-neutral-400" />
                )}
              </div>
            </Link>
            {offer.transporter_verified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-white">
                <ShieldCheck className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>

          {/* Transporter Info */}
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-neutral-900 truncate">
              {transporterId ? (
                <Link
                  href={`/profile/${transporterId}`}
                  className="hover:text-brand-600 transition-colors hover:underline"
                >
                  {offer.transporter_name}
                </Link>
              ) : (
                offer.transporter_name
              )}
            </h4>
            
            {/* Stats Row */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-0.5 text-amber-600 font-medium">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {rating > 0 ? rating.toFixed(1) : "—"}
              </span>
              <span className="text-neutral-300">•</span>
              <span className="inline-flex items-center gap-0.5 truncate">
                <Truck className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {interpolate(
                    jobsCount !== 1
                      ? t.offersComponents.missionsCountPlural
                      : t.offersComponents.missionsCount,
                    { n: jobsCount },
                  )}
                </span>
              </span>
              {completionRate !== null && (
                <>
                  <span className="text-neutral-300">•</span>
                  <span className="inline-flex items-center gap-0.5 text-green-600">
                    <TrendingUp className="w-3 h-3" />
                    {completionRate}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Price */}
        <div className="text-right flex-shrink-0 flex flex-col items-end">
          <p className="text-xl font-bold text-brand-600 whitespace-nowrap">
            {offer.total_price} TND
          </p>
          <p className="text-xs text-neutral-400 whitespace-nowrap mt-0.5">
            {format(new Date(offer.created_at), "d MMM HH:mm", { locale: fr })}
          </p>
        </div>
      </div>

      {/* Message Box */}
      <div className="bg-neutral-50 p-3 rounded-lg text-sm text-neutral-700 break-words">
        <p className="line-clamp-3">{offer.message || t.offersComponents.noMessage}</p>
      </div>

      {/* Trust Badges */}
      <div className="flex flex-wrap gap-1.5">
        {offer.transporter_verified && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-[11px] font-medium rounded-full border border-green-200 whitespace-nowrap">
            <ShieldCheck className="w-3 h-3" />
            {t.profile.verified}
          </span>
        )}
        {isMovingSpecialist && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-[11px] font-medium rounded-full border border-purple-200 whitespace-nowrap">
            <Award className="w-3 h-3" />
            {t.offersComponents.movingSpecialist}
          </span>
        )}
        {jobsCount >= 20 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-medium rounded-full border border-amber-200 whitespace-nowrap">
            <Star className="w-3 h-3" />
            {t.offersComponents.experienced}
          </span>
        )}
        {trustScore !== null && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full border whitespace-nowrap ${
              trustScore >= 80
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : trustScore >= 50
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            <Shield className="w-3 h-3" />
            {interpolate(t.offersComponents.trust, { n: trustScore })}
          </span>
        )}
        {codEligible && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-medium rounded-full border border-blue-200 whitespace-nowrap">
            {t.offersComponents.codAvailable}
          </span>
        )}
        {hasWorkedTogether && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded-full border border-indigo-200 whitespace-nowrap">
            <Handshake className="w-3 h-3" />
            {interpolate(
              pastJobsCount > 1
                ? t.offersComponents.alreadyWorkedPlural
                : t.offersComponents.alreadyWorked,
              { n: pastJobsCount },
            )}
          </span>
        )}
      </div>

      {/* CTA Buttons */}
      {isOwner && offer.status === "PENDING" && (
        <div className="flex flex-col gap-2 mt-2">
          {/* Primary CTA */}
          <button
            onClick={() => onAccept(offer.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-sm"
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{t.offersComponents.acceptOffer}</span>
          </button>

          {/* Secondary Actions */}
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {transporterId && (
              <Link
                href={`/messages?contact=${transporterId}&subject=Question offre #${offer.id}`}
                className="flex-1 flex items-center justify-center gap-2 py-2 border border-neutral-300 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition-colors text-sm min-w-0"
              >
                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{t.offersComponents.askQuestion}</span>
              </Link>
            )}

            {transporterId && (
              <Link
                href={`/profile/${transporterId}`}
                className="flex-1 flex items-center justify-center gap-2 py-2 border border-neutral-300 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition-colors text-sm min-w-0"
              >
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{t.offersComponents.viewProfile}</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {offer.status === "ACCEPTED" && (
        <div className="w-full py-2.5 mt-2 bg-green-50 text-green-700 rounded-xl font-semibold text-center border border-green-200 flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{t.offersComponents.offerAccepted}</span>
        </div>
      )}
    </div>
  );
}
