"use client";

import Link from "next/link";
import {
  MessageSquare,
  Package,
  RotateCcw,
  ShieldCheck,
  Truck,
  UserCheck,
} from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import { formatTND } from "@/lib/format";
import type { JobDetail } from "@/lib/types/jobs";

interface Props {
  job: JobDetail;
  /** Une action sur la contre-proposition est en cours. */
  actionEnCours: boolean;
  onOuvrirLaDemande: () => void;
  onAccepterContreProposition: () => void;
  onRetirerLaDemande: () => void;
}

/**
 * Ce qu'un CLIENT voit d'un trajet retour, et ce qu'il peut y faire — lot 4.1.
 *
 * Le panneau porte tout le parcours de conversion : capacite annoncee, prix
 * indicatif, etat de sa demande, contre-proposition a accepter ou a refuser,
 * et la reassurance sur l'escrow.
 *
 * Extrait de `jobs/[id]/page.tsx`, ou il vivait au milieu des vues
 * transporteur du meme fichier. C'est aussi la premiere piece de la separation
 * des deux roles : ce panneau est ce qui partira dans `/trajets/[id]`.
 *
 * Composant CONTROLE : aucun etat, aucun appel reseau. Le CTA remonte une
 * seule intention — « ouvrir le formulaire de demande » — la ou la page
 * initialisait trois etats a la main sur le meme clic.
 */
export function ReturnTripClientPanel({
  job,
  actionEnCours,
  onOuvrirLaDemande,
  onAccepterContreProposition,
  onRetirerLaDemande,
}: Props) {
  const { t } = useAppI18n();

  return (
    <div className="bg-blue-50 rounded-tile p-5 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center">
          <RotateCcw className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-blue-900">
            {t.jobDetail.returnAvailable}
          </h3>
          <p className="text-xs text-blue-700">
            {t.jobDetail.returnReducedRate}
          </p>
        </div>
      </div>

      {/* Transporter Info */}
      <div className="bg-surface rounded-chip p-3 mb-3 border border-blue-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-700/10 flex items-center justify-center text-blue-700 font-bold text-sm">
            {(job.owner?.name || job.owner?.first_name || "T")[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">
              {job.owner?.name ||
                `${job.owner?.first_name || t.jobDetail.defaultTransporter}`}
            </p>
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              <UserCheck className="w-3 h-3 text-green-500" />
              {t.jobDetail.verifiedTransporter}
            </div>
          </div>
        </div>
      </div>

      {/* Capacity Info */}
      {job.available_capacity && (
        <div className="flex items-center gap-2 text-sm text-blue-700 mb-3">
          <Package className="w-4 h-4" />
          <span>
            {interpolate(t.jobDetail.capacity, {
              cap: job.available_capacity,
            })}
          </span>
        </div>
      )}

      {/* Price */}
      {(job.price_tnd_min || job.price_tnd_max) && (
        <div className="text-center bg-surface rounded-chip py-2 px-3 mb-3 border border-blue-100">
          <p className="text-xs text-neutral-500">
            {t.jobDetail.indicativePrice}
          </p>
          <p className="text-xl font-bold text-blue-700">
            {job.price_tnd_min && job.price_tnd_max
              ? `${formatTND(Number(job.price_tnd_min) || 0)} — ${formatTND(Number(job.price_tnd_max) || 0)}`
              : job.price_tnd_min
                ? `${t.offerForm.from} ${formatTND(Number(job.price_tnd_min) || 0)}`
                : `${t.offerForm.upTo} ${formatTND(Number(job.price_tnd_max) || 0)}`}
          </p>
        </div>
      )}

      {/* D5 — client's existing structured request status */}
      {job.my_trip_request &&
      job.my_trip_request.status !== "CANCELLED" &&
      job.my_trip_request.status !== "REJECTED" ? (
        <div
          data-testid="demande-confirmation"
          className="bg-surface rounded-tile p-4 mb-2 border border-blue-200"
        >
          <p className="text-[14px] font-bold text-ink-900 mb-1">
            {t.jobDetail.myRequestTitle}
          </p>
          <p className="text-sm text-neutral-600">
            {formatTND(job.my_trip_request.proposed_price)} ·{" "}
            {job.my_trip_request.status === "PENDING"
              ? t.jobDetail.myRequestPending
              : job.my_trip_request.status === "ACCEPTED"
                ? t.jobDetail.myRequestAccepted
                : t.jobDetail.myRequestCountered}
          </p>
          {job.my_trip_request.status === "COUNTERED" &&
            job.my_trip_request.counter_price != null && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">
                  {interpolate(t.jobDetail.counterProposal, {
                    price: formatTND(job.my_trip_request.counter_price),
                  })}
                  {job.my_trip_request.response_message && (
                    <span className="block text-xs italic mt-1">
                      « {job.my_trip_request.response_message} »
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  <button
                    data-testid="contre-offre-accepter"
                    onClick={onAccepterContreProposition}
                    disabled={actionEnCours}
                    className="flex-1 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {t.jobDetail.acceptCounter}
                  </button>
                  <button
                    data-testid="contre-offre-refuser"
                    onClick={onRetirerLaDemande}
                    disabled={actionEnCours}
                    className="flex-1 py-2 border border-neutral-300 text-neutral-600 rounded-lg text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {t.jobDetail.declineCounter}
                  </button>
                </div>
              </div>
            )}
          {job.my_trip_request.status === "PENDING" && (
            <button
              onClick={onRetirerLaDemande}
              disabled={actionEnCours}
              className="mt-2 text-xs text-neutral-500 hover:text-error-500 underline"
            >
              {t.jobDetail.cancelMyRequest}
            </button>
          )}
        </div>
      ) : (
        /* Primary CTA — request (default) or instant booking (D11) */
        <button
          data-testid="trajet-envoyer-demande"
          onClick={onOuvrirLaDemande}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-700 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-700/20 mb-2"
        >
          <Truck className="w-5 h-5" />
          {job.instant_booking
            ? t.jobDetail.bookThisTrip
            : t.jobDetail.sendRequest}
        </button>
      )}

      {/* Secondary CTA — Contacter */}
      <Link
        href={`/messages?contact=${job.owner?.id}&subject=Trajet retour #${job.id}`}
        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-blue-300 text-blue-700 rounded-xl font-medium hover:bg-blue-50 transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        {t.jobDetail.contactTransporter}
      </Link>
      <p
        data-testid="demande-reassurance-paiement"
        className="text-xs text-blue-600 text-center mt-2 flex items-center justify-center gap-1"
      >
        <ShieldCheck className="w-3 h-3" />
        {t.jobDetail.securePaymentEscrow}
      </p>
    </div>
  );
}
