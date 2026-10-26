import React from "react";

/* -------------------------------------------------------------------------- */
/*  Ligne d'itinéraire — SIGNATURE DE LA MARQUE (charte §3)                   */
/*                                                                            */
/*  Point départ #1E3A8A → tiret 1.5px dashed #D5DBE6 → point arrivée         */
/*  #2FAC55, avec la distance en 11.5px #6B7280 insérée AU MILIEU de la       */
/*  ligne — pas à côté, pas en dessous.                                       */
/*                                                                            */
/*  En version verticale (écran détail) : colonne de 1.5px #DFE4EE entre les  */
/*  deux points, adresses à droite.                                           */
/*                                                                            */
/*  Le départ est bleu (identité) et l'arrivée verte (valeur : la livraison   */
/*  est l'issue qu'on cherche). Cette convention ne s'inverse jamais.         */
/* -------------------------------------------------------------------------- */

export interface RouteLineProps {
  /** Libellé du point de départ */
  from: string;
  /** Libellé du point d'arrivée */
  to: string;
  /** Distance affichée au milieu de la ligne, par exemple « 268 km » */
  distance?: string | null;
  /** `on-blue` inverse les filets et les encres pour un fond bleu */
  surface?: "light" | "on-blue";
  className?: string;
}

/** Version horizontale, compacte : pour une carte de liste. */
export function RouteLine({
  from,
  to,
  distance,
  surface = "light",
  className = "",
}: RouteLineProps) {
  const encre = surface === "on-blue" ? "text-white" : "text-ink-900";

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div
        className={`route-line ${surface === "on-blue" ? "route-line--on-blue" : ""}`}
      >
        <span className="route-dot route-dot--start" aria-hidden />
        <span className="route-dash" aria-hidden>
          {distance && <span className="route-distance">{distance}</span>}
        </span>
        <span className="route-dot route-dot--end" aria-hidden />
      </div>

      <div className="flex items-start justify-between gap-3">
        <p
          className={`min-w-0 flex-1 truncate text-[14px] font-semibold ${encre}`}
        >
          {from}
        </p>
        <p
          className={`min-w-0 flex-1 truncate text-end text-[14px] font-semibold ${encre}`}
        >
          {to}
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export interface RouteVerticalStep {
  /** Libellé principal — une adresse, en général */
  label: string;
  /** Précision secondaire : date, créneau, contact */
  detail?: React.ReactNode;
}

export interface RouteVerticalProps {
  from: RouteVerticalStep;
  to: RouteVerticalStep;
  /** Distance rappelée sur le rail, entre les deux points */
  distance?: string | null;
  surface?: "light" | "on-blue";
  className?: string;
}

/** Version verticale : pour l'écran de détail, où les adresses respirent. */
export function RouteVertical({
  from,
  to,
  distance,
  surface = "light",
  className = "",
}: RouteVerticalProps) {
  const encre = surface === "on-blue" ? "text-white" : "text-ink-900";
  const encreDetail =
    surface === "on-blue" ? "text-on-blue-300" : "text-ink-500";
  const rail = surface === "on-blue" ? "bg-white/35" : "bg-[#DFE4EE]";

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Départ */}
      <div className="route-vertical">
        <span
          className="route-dot route-dot--start mt-[6px] self-start"
          aria-hidden
        />
        <div className="flex min-w-0 flex-col gap-0.5 pb-3">
          <p className={`text-[14.5px] font-bold leading-[1.35] ${encre}`}>
            {from.label}
          </p>
          {from.detail && (
            <p className={`text-[12.5px] ${encreDetail}`}>{from.detail}</p>
          )}
        </div>
      </div>

      {/* Rail + distance */}
      <div className="route-vertical">
        <span className={`route-vertical__rail ${rail}`} aria-hidden />
        {distance && (
          <p
            className={`-mt-1 pb-3 text-[11.5px] font-semibold tabular ${encreDetail}`}
          >
            {distance}
          </p>
        )}
      </div>

      {/* Arrivée */}
      <div className="route-vertical">
        <span
          className="route-dot route-dot--end mt-[6px] self-start"
          aria-hidden
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className={`text-[14.5px] font-bold leading-[1.35] ${encre}`}>
            {to.label}
          </p>
          {to.detail && (
            <p className={`text-[12.5px] ${encreDetail}`}>{to.detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default RouteLine;
