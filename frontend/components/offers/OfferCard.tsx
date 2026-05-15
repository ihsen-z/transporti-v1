import React from "react";
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
  const trustScore = offer.transporter_trust_score ?? null;
  const transporterId = offer.transporter_id;
  const codEligible = (offer.total_price ?? 0) <= 300;
  const hasWorkedTogether = offer.has_worked_together === true;
  const pastJobsCount = offer.past_jobs_count ?? 0;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group">
      {/* Header: Avatar + Name + Price */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* P0-02: Avatar cliquable vers profil */}
            <Link href={transporterId ? `/profile/${transporterId}` : "#"}>
              <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-neutral-200 group-hover:ring-brand-300 transition-colors cursor-pointer">
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
            </Link>
            {offer.transporter_verified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-white">
                <ShieldCheck className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div>
            {/* P0-02: Nom cliquable vers profil */}
            <h4 className="font-semibold text-neutral-900 flex items-center gap-1.5">
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

      {/* Trust Badges + Trust Score (P1-01) */}
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
        {/* P1-01: Trust Score badge */}
        {trustScore !== null && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${
              trustScore >= 80
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : trustScore >= 50
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            <Shield className="w-3 h-3" />
            Confiance {trustScore}/100
          </span>
        )}
        {/* P2-10: COD eligibility hint */}
        {codEligible && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
            💵 COD disponible
          </span>
        )}
        {/* P2-07: Collaboration history badge */}
        {hasWorkedTogether && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200">
            <Handshake className="w-3 h-3" />
            Déjà {pastJobsCount} mission{pastJobsCount > 1 ? "s" : ""} ensemble
          </span>
        )}
      </div>

      {/* Message */}
      <div className="bg-neutral-50 p-3 rounded-lg text-sm text-neutral-700 mb-4">
        {offer.message || "Aucun message."}
      </div>

      {/* Actions — P0-02 link + P0-03 pré-chat + Accept button */}
      {isOwner && offer.status === "PENDING" && (
        <div className="space-y-2">
          <button
            onClick={() => onAccept(offer.id)}
            className="w-full py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 hover:shadow-md hover:shadow-green-600/20"
          >
            <CheckCircle className="w-4 h-4" />
            Accepter cette offre
          </button>

          <div className="flex gap-2">
            {/* P0-03: Pré-chat — contacter avant acceptation */}
            {transporterId && (
              <Link
                href={`/messages?contact=${transporterId}&subject=Question offre #${offer.id}`}
                className="flex-1 py-2 border border-neutral-300 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Poser une question
              </Link>
            )}

            {/* P0-02: Lien profil */}
            {transporterId && (
              <Link
                href={`/profile/${transporterId}`}
                className="flex-1 py-2 border border-neutral-300 text-neutral-700 rounded-xl font-medium hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Voir le profil
              </Link>
            )}
          </div>
        </div>
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
