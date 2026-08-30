"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, FileText, MessageSquare } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import type { JobDetail } from "@/lib/types/jobs";

interface Props {
  job: JobDetail;
  estLeProprietaire: boolean;
  estLeTransporteurAssigne: boolean;
  paiementEnCours: boolean;
  demarrageEnCours: boolean;
  onPayer: () => void;
  onConfirmerLeDemarrage: () => void;
}

/**
 * Mission attribuee, paiement en cours de securisation (D3).
 *
 * Quatre situations dans un seul bloc, et c'est voulu : ce que chacun voit
 * depend a la fois de son ROLE et du MOYEN DE PAIEMENT. Un client en paiement
 * numerique doit payer ; en paiement a la livraison il attend le transporteur.
 * Le transporteur, symetriquement, confirme le depart en COD et attend le
 * paiement en numerique. Separer ces quatre cas en quatre composants
 * masquerait justement la symetrie qui les rend comprehensibles.
 *
 * Extrait de `jobs/[id]/page.tsx` — lot 4.1. Composant CONTROLE : aucun etat,
 * aucun appel reseau.
 */
export function MissionMatchedPanel({
  job,
  estLeProprietaire,
  estLeTransporteurAssigne,
  paiementEnCours,
  demarrageEnCours,
  onPayer,
  onConfirmerLeDemarrage,
}: Props) {
  const { t } = useAppI18n();
  const router = useRouter();

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-amber-800">
      <h3 className="font-bold flex items-center gap-2 mb-2">
        <Clock className="w-5 h-5" />
        {t.jobDetail.matchedTitle}
      </h3>
      {/* Client + DIGITAL → pay now */}
      {estLeProprietaire && job.booking_payment_method === "DIGITAL" && (
        <>
          <p className="text-sm mb-3">{t.jobDetail.matchedClientPay}</p>
          <button
            onClick={onPayer}
            disabled={paiementEnCours}
            className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {paiementEnCours ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {paiementEnCours ? t.jobDetail.paying : t.jobDetail.payNow}
          </button>
        </>
      )}
      {/* Client + COD → waiting for transporter confirmation */}
      {estLeProprietaire && job.booking_payment_method === "COD" && (
        <p className="text-sm">{t.jobDetail.matchedClientCod}</p>
      )}
      {/* Transporter + COD → confirm start */}
      {estLeTransporteurAssigne && job.booking_payment_method === "COD" && (
        <>
          <p className="text-sm mb-3">{t.jobDetail.matchedTransporterCod}</p>
          <button
            onClick={onConfirmerLeDemarrage}
            disabled={demarrageEnCours}
            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {demarrageEnCours ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {demarrageEnCours
              ? t.jobDetail.confirming
              : t.jobDetail.confirmStart}
          </button>
        </>
      )}
      {/* Transporter + DIGITAL → waiting for client payment */}
      {estLeTransporteurAssigne && job.booking_payment_method === "DIGITAL" && (
        <p className="text-sm">{t.jobDetail.matchedTransporterDigital}</p>
      )}
      <div className="mt-3 space-y-2">
        <button
          onClick={() => router.push(`/messages/${job.id}`)}
          className="w-full py-2 bg-white border border-amber-300 text-amber-800 rounded-lg font-medium hover:bg-amber-100 flex items-center justify-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          {t.jobDetail.openMessaging}
        </button>
        <Link
          href={`/reservation/${job.id}`}
          className="w-full py-2 border border-amber-300 text-amber-800 rounded-lg font-medium hover:bg-amber-100 flex items-center justify-center gap-2"
        >
          <FileText className="w-4 h-4" />
          {t.jobDetail.viewBooking}
        </Link>
      </div>
    </div>
  );
}
