"use client";

import { ArrowRight, Package, User } from "lucide-react";
import { anciennete, type TripRequest } from "@/lib/services/tripRequests";

/**
 * T2.1 — Une demande reçue, actionnable sans ouvrir de détail.
 *
 * Les trois actions sont **hiérarchisées** : accepter est plein et coloré,
 * contre-proposer est bordé, refuser est en texte seul. Un transporteur qui
 * survole la carte doit voir immédiatement quelle est l'issue normale.
 *
 * Le prix proposé est le chiffre qui décide : il est traité comme tel, pas
 * noyé dans une ligne de détails.
 */

interface Props {
  demande: TripRequest;
  onAccepter: (demande: TripRequest) => void;
  onContreProposer: (demande: TripRequest) => void;
  onRefuser: (demande: TripRequest) => void;
  /** Action en cours sur cette carte : les boutons sont neutralisés. */
  enCours?: boolean;
  /** Les demandes archivées ne sont plus actionnables. */
  lectureSeule?: boolean;
}

export default function ReceivedRequestCard({
  demande,
  onAccepter,
  onContreProposer,
  onRefuser,
  enCours = false,
  lectureSeule = false,
}: Props) {
  const dateTrajet = new Date(demande.job_date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });

  return (
    <article
      data-testid="demande-recue"
      className={`border border-neutral-200 rounded-xl p-4 bg-white ${
        enCours ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-neutral-900 flex items-center gap-2">
            <User className="w-4 h-4 text-neutral-400" aria-hidden="true" />
            {demande.client_name}
          </p>
          {demande.description && (
            <p className="mt-1 text-sm text-neutral-600 flex items-start gap-2">
              <Package
                className="w-3.5 h-3.5 mt-0.5 text-neutral-400 shrink-0"
                aria-hidden="true"
              />
              {demande.description}
            </p>
          )}
        </div>

        {/* Le chiffre qui décide. */}
        <p className="text-xl font-bold text-neutral-900 tabular-nums">
          {demande.proposed_price} DT
        </p>
      </div>

      <p className="mt-2 text-sm text-neutral-500 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          {demande.job_pickup}
          <ArrowRight className="w-3 h-3 text-neutral-400" aria-hidden="true" />
          {demande.job_dropoff}
        </span>
        <span aria-hidden="true">·</span>
        <span>{dateTrajet}</span>
        <span aria-hidden="true">·</span>
        <span>{anciennete(demande)}</span>
      </p>

      {demande.status === "COUNTERED" && demande.counter_price && (
        <p className="mt-2 text-sm text-brand-700 bg-brand-50 rounded-lg px-3 py-2">
          Vous avez contre-proposé{" "}
          <strong className="tabular-nums">{demande.counter_price} DT</strong>.
          En attente de la réponse du client.
        </p>
      )}

      {!lectureSeule && (
        <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="demande-recue-accepter"
            onClick={() => onAccepter(demande)}
            disabled={enCours}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-cta-500 text-white hover:bg-cta-600 focus-visible:ring-2 focus-visible:ring-cta-500/40 outline-none disabled:opacity-50"
          >
            Accepter
          </button>

          <button
            type="button"
            data-testid="demande-recue-contre-proposer"
            onClick={() => onContreProposer(demande)}
            disabled={enCours}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-600/30 outline-none disabled:opacity-50"
          >
            Contre-proposer
          </button>

          {/* Refuser est irréversible côté client : en texte seul, jamais au
              même poids visuel que les deux autres. */}
          <button
            type="button"
            data-testid="demande-recue-refuser"
            onClick={() => onRefuser(demande)}
            disabled={enCours}
            className="px-3 py-2 text-sm text-neutral-500 hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-neutral-400/40 outline-none rounded-lg disabled:opacity-50 ms-auto"
          >
            Refuser
          </button>
        </div>
      )}
    </article>
  );
}
