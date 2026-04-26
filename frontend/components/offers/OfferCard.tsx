import React from "react";
import {
  User,
  Star,
  ShieldCheck,
  CheckCircle,
  Truck,
  Clock,
  Award,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OfferCardProps {
  offer: any;
  isOwner: boolean;
  onAccept: (offerId: number) => void;
}

export function OfferCard({ offer, isOwner, onAccept }: OfferCardProps) {
  const rating = offer.transporter_rating ?? 0;
  const jobsCount = offer.transporter_jobs_count ?? 0;
  const completionRate = offer.transporter_completion_rate ?? null;
  const isMovingSpecialist = offer.transporter_moving_specialist === true;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group">
      {/* Header: Avatar + Name + Price */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-neutral-200 group-hover:ring-brand-300 transition-colors">
              {offer.transporter_avatar ? (
                <img
                  src={offer.transporter_avatar}
                  alt={offer.transporter_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 text-neutral-400" />
              )}
            </div>
            {offer.transporter_verified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-white">
                <ShieldCheck className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div>
            <h4 className="font-semibold text-neutral-900 flex items-center gap-1.5">
              {offer.transporter_name}
            </h4>
            {/* Trust Signals Row */}
            <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-0.5 text-amber-600 font-medium">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {rating > 0 ? rating.toFixed(1) : "—"}
              </span>
              <span className="text-neutral-300">•</span>
              <span className="inline-flex items-center gap-0.5">
                <Truck className="w-3 h-3" />
                {jobsCount} mission{jobsCount !== 1 ? "s" : ""}
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

        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-brand-600">
            {offer.total_price} TND
          </p>
          <p className="text-xs text-neutral-400">
            {format(new Date(offer.created_at), "d MMM HH:mm", { locale: fr })}
          </p>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {offer.transporter_verified && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
            <ShieldCheck className="w-3 h-3" />
            Vérifié
          </span>
        )}
        {isMovingSpecialist && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-200">
            <Award className="w-3 h-3" />
            Spécialiste déménagement
          </span>
        )}
        {jobsCount >= 20 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
            <Star className="w-3 h-3" />
            Expérimenté
          </span>
        )}
      </div>

      {/* Message */}
      <div className="bg-neutral-50 p-3 rounded-lg text-sm text-neutral-700 mb-4">
        {offer.message || "Aucun message."}
      </div>

      {/* Actions */}
      {isOwner && offer.status === "PENDING" && (
        <button
          onClick={() => onAccept(offer.id)}
          className="w-full py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 hover:shadow-md hover:shadow-green-600/20"
        >
          <CheckCircle className="w-4 h-4" />
          Accepter cette offre
        </button>
      )}

      {offer.status === "ACCEPTED" && (
        <div className="w-full py-2.5 bg-green-50 text-green-700 rounded-xl font-semibold text-center border border-green-200 flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Offre acceptée
        </div>
      )}
    </div>
  );
}
