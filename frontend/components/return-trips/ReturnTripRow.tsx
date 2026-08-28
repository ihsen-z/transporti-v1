"use client";

import { Calendar, Copy, Clock, Pencil, Package, Trash2 } from "lucide-react";
import {
  daysUntilExpiry,
  isExpired,
  type ReturnTrip,
} from "@/lib/services/returnTrips";

/**
 * Une ligne de l'inventaire des trajets retour — T1.3, lot 1.
 *
 * Le pivot classe le cycle de vie de l'inventaire en **Core** : « un inventaire
 * non gérable pollue la recherche client — létal pour un produit dont la
 * recherche EST la promesse ». D'où les quatre actions accessibles directement
 * sur la ligne, sans ouvrir un détail.
 *
 * L'expiration est affichée en clair et non déduite par le lecteur : un trajet
 * qui expire sans que le transporteur s'en aperçoive disparaît silencieusement
 * de la recherche.
 */

interface Props {
  trajet: ReturnTrip;
  onEditer: (trajet: ReturnTrip) => void;
  onProlonger: (trajet: ReturnTrip) => void;
  onDupliquer: (trajet: ReturnTrip) => void;
  onDepublier: (trajet: ReturnTrip) => void;
  /** Action en cours sur cette ligne, pour désactiver les boutons. */
  enCours?: boolean;
}

function libelleExpiration(trajet: ReturnTrip): {
  texte: string;
  ton: "normal" | "urgent" | "expire";
} {
  if (isExpired(trajet)) {
    return { texte: "Expiré — invisible dans la recherche", ton: "expire" };
  }
  const jours = daysUntilExpiry(trajet);
  if (jours <= 1) return { texte: "Expire aujourd'hui", ton: "urgent" };
  if (jours <= 3) return { texte: `Expire dans ${jours} jours`, ton: "urgent" };
  return { texte: `Expire dans ${jours} jours`, ton: "normal" };
}

const TONS_EXPIRATION = {
  normal: "text-neutral-500",
  urgent: "text-warning-dark font-semibold",
  expire: "text-error-dark font-semibold",
} as const;

export default function ReturnTripRow({
  trajet,
  onEditer,
  onProlonger,
  onDupliquer,
  onDepublier,
  enCours = false,
}: Props) {
  const expiration = libelleExpiration(trajet);
  const date = new Date(trajet.scheduled_time).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });

  return (
    <article
      data-testid="retours-ligne"
      className={`border border-neutral-200 rounded-xl p-4 bg-white transition-opacity ${
        enCours ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-neutral-900">
            {trajet.pickup_governorate} → {trajet.dropoff_governorate}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              {date}
            </span>
            {trajet.available_capacity && (
              <span className="inline-flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" aria-hidden="true" />
                {trajet.available_capacity}
              </span>
            )}
          </div>
        </div>

        <p
          data-testid="retours-ligne-expiration"
          className={`text-sm ${TONS_EXPIRATION[expiration.ton]}`}
        >
          {expiration.texte}
        </p>
      </div>

      <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="retours-ligne-editer"
          onClick={() => onEditer(trajet)}
          disabled={enCours}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-600/30 outline-none disabled:opacity-50"
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
          Éditer
        </button>

        <button
          type="button"
          data-testid="retours-ligne-prolonger"
          onClick={() => onProlonger(trajet)}
          disabled={enCours}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-600/30 outline-none disabled:opacity-50"
        >
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          Prolonger d&apos;une semaine
        </button>

        <button
          type="button"
          data-testid="retours-ligne-dupliquer"
          onClick={() => onDupliquer(trajet)}
          disabled={enCours}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-brand-600/30 outline-none disabled:opacity-50"
        >
          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
          Dupliquer
        </button>

        {/* Dépublier est destructif et notifie les demandes en attente : traité
            en dernier, en texte seul, jamais au même poids que les autres. */}
        <button
          type="button"
          data-testid="retours-ligne-depublier"
          onClick={() => onDepublier(trajet)}
          disabled={enCours}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-error-dark hover:bg-error-light/40 focus-visible:ring-2 focus-visible:ring-error/30 outline-none disabled:opacity-50 ms-auto"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          Dépublier
        </button>
      </div>
    </article>
  );
}
