"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Clock,
  FileText,
  MapPin,
  MessageSquare,
  Package,
  Truck,
  XCircle,
} from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { formatDateTime } from "@/lib/format";
import type { JobDetail } from "@/lib/types/jobs";

interface Props {
  job: JobDetail;
  /** Le transporteur qui regarde est celui qui execute la mission. */
  estLeTransporteurAssigne: boolean;
  /** Les conditions de livraison sont reunies (statut, role, paiement). */
  peutMarquerLivre: boolean;
  jalonEnCours: boolean;
  livraisonEnCours: boolean;
  onEnregistrerJalon: (event: "ARRIVED_PICKUP" | "LOADED") => void;
  onDemanderLaLivraison: () => void;
  onDemanderLAnnulation: () => void;
}

/**
 * Mission en cours : jalons, code de livraison, actions du transporteur.
 *
 * Extrait de `jobs/[id]/page.tsx` — lot 4.1. Ce bloc melait deux lectures du
 * meme etat : la chronologie que les DEUX parties voient, et les actions
 * reservees au transporteur assigne. Les conditions restent calculees par la
 * page, qui connait l'utilisateur ; le panneau ne fait que les rendre.
 *
 * Composant CONTROLE : aucun etat, aucun appel reseau. Les demandes de
 * confirmation remontent a la page, qui detient les dialogues.
 */
export function MissionInProgressPanel({
  job,
  estLeTransporteurAssigne,
  peutMarquerLivre,
  jalonEnCours,
  livraisonEnCours,
  onEnregistrerJalon,
  onDemanderLaLivraison,
  onDemanderLAnnulation,
}: Props) {
  const { t } = useAppI18n();
  // Navigation vers la messagerie : c est une intention d interface, pas un
  // etat de la page. Le composant la porte lui-meme plutot que de la faire
  // remonter en propriete.
  const router = useRouter();

  return (
    <div className="bg-brand-600/5 border border-brand-600/20 rounded-xl p-4 text-brand-700">
      <h3 className="font-bold flex items-center gap-2 mb-2">
        <Clock className="w-5 h-5" />
        {t.jobDetail.missionInProgress}
      </h3>
      <p className="text-sm">
        {estLeTransporteurAssigne
          ? t.jobDetail.assignedToYou
          : t.jobDetail.transporterAssignedInfo}
      </p>

      {/* D2' — mission timeline (visible to both parties) */}
      {(job.events?.length ?? 0) > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {(job.events ?? []).map((e, i) => (
            <li key={i} className="flex items-center gap-2 text-brand-700">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span>
                {(
                  {
                    ARRIVED_PICKUP: t.jobDetail.eventArrivedPickup,
                    LOADED: t.jobDetail.eventLoaded,
                    DELIVERED: t.jobDetail.eventDelivered,
                  } as Record<string, string>
                )[e.event] || e.event}
              </span>
              <span className="text-brand-400 ms-auto">
                {formatDateTime(e.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* D7 — the paying client holds the delivery code */}
      {job.delivery_pin && !estLeTransporteurAssigne && (
        <div className="mt-3 p-3 bg-white border-2 border-dashed border-brand-300 rounded-lg text-center">
          <p className="text-xs text-neutral-500 mb-1">
            {t.jobDetail.deliveryPinLabel}
          </p>
          <p className="text-2xl font-bold tracking-[0.4em] text-brand-700">
            {job.delivery_pin}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            {t.jobDetail.deliveryPinHint}
          </p>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {/* D2' — next milestone for the assigned transporter */}
        {estLeTransporteurAssigne &&
          !(job.events ?? []).some((e) => e.event === "ARRIVED_PICKUP") && (
            <button
              onClick={() => onEnregistrerJalon("ARRIVED_PICKUP")}
              disabled={jalonEnCours}
              className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <MapPin className="w-4 h-4" />
              {t.jobDetail.milestoneArrived}
            </button>
          )}
        {estLeTransporteurAssigne &&
          (job.events ?? []).some((e) => e.event === "ARRIVED_PICKUP") &&
          !(job.events ?? []).some((e) => e.event === "LOADED") && (
            <button
              onClick={() => onEnregistrerJalon("LOADED")}
              disabled={jalonEnCours}
              className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Truck className="w-4 h-4" />
              {t.jobDetail.milestoneLoaded}
            </button>
          )}
        {/* P0-01: CTA "Marquer comme livré" — Transporteur uniquement */}
        {peutMarquerLivre && (
          <button
            onClick={() => onDemanderLaLivraison()}
            disabled={livraisonEnCours}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 hover:shadow-md hover:shadow-emerald-600/20"
          >
            {livraisonEnCours ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : (
              <Package className="w-4 h-4" />
            )}
            {livraisonEnCours
              ? t.jobDetail.confirming
              : t.jobDetail.markDelivered}
          </button>
        )}
        <button
          onClick={() => router.push(`/messages/${job.id}`)}
          className="w-full py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 flex items-center justify-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          {t.jobDetail.openMessaging}
        </button>
        <Link
          href={`/reservation/${job.id}`}
          className="w-full py-2 border border-brand-600/30 text-brand-700 rounded-lg font-medium hover:bg-brand-600/5 flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          {t.jobDetail.viewBooking}
        </Link>
        {/* P2-03: Cancel mutuel — transporteur peut annuler */}
        {estLeTransporteurAssigne && (
          <button
            onClick={() => onDemanderLAnnulation()}
            className="w-full py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 flex items-center justify-center gap-2 text-sm transition-colors"
          >
            <XCircle className="w-4 h-4" />
            {t.jobDetail.cancelMission}
          </button>
        )}
      </div>
    </div>
  );
}
