"use client";

import React from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ShieldCheck,
  Star,
} from "lucide-react";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/**
 * D1' — Panneau unique et cohérent pour l'état POST-LIVRAISON (job COMPLETED).
 *
 * Avant : la page affichait plusieurs cartes en même temps (confirmation ambre
 * « action requise » + résumé vert « mission terminée » toujours visible), ce qui
 * donnait des états contradictoires : le client voyait « confirmez pour libérer
 * le paiement » ET « paiement libéré » simultanément.
 *
 * Ici, l'état principal est MUTUELLEMENT EXCLUSIF :
 *   - paiement en attente de libération  ->  UNE seule carte (action ou info)
 *   - paiement libéré (client a confirmé) ->  UNE seule carte de succès
 * La section avis reste distincte car c'est une action séparée du paiement.
 */
interface PostDeliveryPanelProps {
  jobId: number;
  isOwner: boolean;
  isTransporter: boolean;
  /** Le client a confirmé la réception -> escrow libéré. */
  clientConfirmed: boolean;
  /** L'utilisateur courant a déjà laissé un avis. */
  hasReviewed: boolean;
  /** Confirmation de réception en cours (spinner du bouton). */
  confirming: boolean;
  /** Ouvre le dialogue de confirmation géré par la page parente. */
  onConfirmClick: () => void;
  /** Rafraîchit le job après soumission d'un avis. */
  onReviewSubmitted: () => void;
}

export function PostDeliveryPanel({
  jobId,
  isOwner,
  isTransporter,
  clientConfirmed,
  hasReviewed,
  confirming,
  onConfirmClick,
  onReviewSubmitted,
}: PostDeliveryPanelProps) {
  const { t } = useAppI18n();

  // Le formulaire d'avis : le client attend d'avoir confirmé la réception ;
  // le transporteur peut noter dès la livraison.
  const showReviewForm = !hasReviewed && (isOwner ? clientConfirmed : true);

  return (
    <div className="space-y-4">
      {/* ---- ÉTAT PRINCIPAL (une seule carte à la fois) ---- */}
      {clientConfirmed ? (
        /* Paiement libéré — état final de succès */
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 animate-fade-in-up">
          <h3 className="font-bold flex items-center gap-2 mb-1 text-green-800">
            <ShieldCheck className="w-5 h-5" />
            {t.jobDetail.missionCompleted}
          </h3>
          <p className="text-sm text-green-800">
            {t.jobDetail.deliveryReleasedBadge}
          </p>
        </div>
      ) : isOwner ? (
        /* Client — action requise : confirmer la réception pour libérer l'escrow */
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 animate-fade-in-up">
          <h3 className="font-bold flex items-center gap-2 mb-2 text-amber-900">
            <AlertCircle className="w-5 h-5" />
            {t.jobDetail.confirmDeliveryTitle}
          </h3>
          <p className="text-sm text-amber-800 mb-4">
            {t.jobDetail.confirmDeliveryDesc}
          </p>
          <button
            onClick={onConfirmClick}
            disabled={confirming}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {confirming ? (
              t.jobDetail.confirming
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                {t.jobDetail.confirmReceiveRelease}
              </>
            )}
          </button>
        </div>
      ) : (
        /* Transporteur (ou autre) — livré, en attente de la confirmation client */
        <div className="bg-brand-600/5 border border-brand-600/20 rounded-xl p-4 text-brand-700">
          <h3 className="font-bold flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5" />
            {t.jobDetail.awaitingConfirmation}
          </h3>
          <p className="text-sm">{t.jobDetail.awaitingConfirmationDesc}</p>
        </div>
      )}

      {/* ---- SECTION AVIS (action distincte du paiement) ---- */}
      {showReviewForm && (
        <div className="animate-fade-in-up">
          <ReviewForm jobId={jobId} onReviewSubmitted={onReviewSubmitted} />
        </div>
      )}

      {hasReviewed && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex items-center gap-2 text-neutral-600">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-sm">{t.jobDetail.alreadyReviewed}</span>
        </div>
      )}
    </div>
  );
}
