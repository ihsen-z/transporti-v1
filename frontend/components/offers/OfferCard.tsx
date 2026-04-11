import React from "react";
import { User, Star, ShieldCheck, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OfferCardProps {
  offer: any;
  isOwner: boolean;
  onAccept: (offerId: number) => void;
}

export function OfferCard({ offer, isOwner, onAccept }: OfferCardProps) {
  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center overflow-hidden">
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
          <div>
            <h4 className="font-semibold text-neutral-900 flex items-center gap-1">
              {offer.transporter_name}
              {offer.transporter_verified && (
                <ShieldCheck className="w-4 h-4 text-green-600" />
              )}
            </h4>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="flex items-center text-yellow-500">
                <Star className="w-3 h-3 fill-current mr-0.5" />
                {offer.transporter_rating.toFixed(1)}
              </span>
              <span>• {offer.transporter_jobs_count} missions</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-brand-600">
            {offer.total_price} TND
          </p>
          <p className="text-xs text-neutral-400">
            {format(new Date(offer.created_at), "d MMM HH:mm", { locale: fr })}
          </p>
        </div>
      </div>

      <div className="bg-neutral-50 p-3 rounded-lg text-sm text-neutral-700 mb-4">
        {offer.message || "Aucun message."}
      </div>

      {isOwner && offer.status === "PENDING" && (
        <button
          onClick={() => onAccept(offer.id)}
          className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Accepter l'offre
        </button>
      )}

      {offer.status === "ACCEPTED" && (
        <div className="w-full py-2 bg-green-50 text-green-700 rounded-lg font-medium text-center border border-green-200">
          Offre acceptée
        </div>
      )}
    </div>
  );
}
