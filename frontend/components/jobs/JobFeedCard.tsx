"use client";

import React from "react";
import Link from "next/link";
import { Calendar, Home, Users, Zap, RotateCcw, Truck } from "lucide-react";
import { formatAmountCompact, formatDate } from "@/lib/format";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import { urlJob } from "@/lib/routes/jobs";
import { RouteLine } from "@/components/ui/RouteLine";
import { Tag, DiscountBadge } from "@/components/ui/Tag";

/**
 * Le sous-ensemble reellement lu par cette carte. Typage explicite plutot que
 * `any` (CLAUDE.md §3) : c'est ce qui a permis de voir que `estimated_savings`
 * pouvait etre absent et devait donc etre traite comme tel.
 */
export interface JobFeedItem {
  id: number;
  is_return_trip?: boolean;
  price_tnd_min?: string | number | null;
  price_tnd_max?: string | number | null;
  /** C1.2 — economie face a un transport dedie. `null` quand incalculable. */
  estimated_savings?: number | null;
  /** Prix du dedie servant de reference. Jamais un montant nu. */
  savings_basis?: number | null;
  // Le reste de la carte lit une quinzaine d'autres champs sans typage. Les
  // typer tous fait tomber une cascade d'erreurs qui depasse le cadre de C1.2 :
  // c'est du perimetre du lot 4 (dette). L'index reste donc permissif, et seuls
  // les champs introduits ici sont contraints — amelioration partielle, pas
  // conformite au CLAUDE.md §3.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [cle: string]: any;
}

interface JobFeedCardProps {
  job: JobFeedItem;
}

/* -------------------------------------------------------------------------- */
/*  Carte de trajet — ORDRE IMPOSÉ PAR LA CHARTE (§3)                         */
/*                                                                            */
/*    (1) identité + nature + badge remise vert en pill                       */
/*    (2) ligne d'itinéraire                                                  */
/*    (3) tags                                                                */
/*    (4) pied de carte : prix + action                                       */
/*                                                                            */
/*  Prix : ancien prix barré #9AA3B2 12.5px AU-DESSUS, prix courant 23px/800. */
/*  Le vert ne sert qu'à la valeur (la remise), jamais à l'action.            */
/* -------------------------------------------------------------------------- */

export function JobFeedCard({ job }: JobFeedCardProps) {
  const { t } = useAppI18n();
  const isTransport = job.job_type === "TRANSPORT";

  // Urgency: job date < 48h from now
  const hoursUntilJob = Math.floor(
    (new Date(job.scheduled_time).getTime() - Date.now()) / (1000 * 60 * 60),
  );
  const isUrgent = hoursUntilJob > 0 && hoursUntilJob < 48;
  const offerCount = job.offer_count || 0;

  // La remise se DÉDUIT de l'economie et de sa base : c'est le meme couple de
  // champs qu'avant, rendu comme la charte l'attend (pill verte + prix barre)
  // au lieu d'une phrase dans un encadre.
  const economie =
    job.estimated_savings != null ? Math.round(job.estimated_savings) : null;
  const base = job.savings_basis != null ? Math.round(job.savings_basis) : null;
  const remisePourcent =
    economie != null && base != null && base > 0
      ? Math.round((economie / base) * 100)
      : null;

  // L API sert des decimales en chaine : la fourchette est formatee sans
  // centimes superflus, sinon la carte affiche « 100,00 – 300,00 ».
  const aUnPrix = job.price_tnd_min || job.price_tnd_max;
  const borne = (v: string | number | null | undefined) =>
    v == null || v === "" ? null : formatAmountCompact(Number(v));
  const prixMin = borne(job.price_tnd_min);
  const prixMax = borne(job.price_tnd_max);
  const prixCourant = !aUnPrix
    ? null
    : prixMin && prixMax && prixMin !== prixMax
      ? `${prixMin} – ${prixMax}`
      : (prixMin ?? prixMax);

  const distance =
    job.distance_km != null && Number(job.distance_km) > 0
      ? `${Math.round(Number(job.distance_km))} km`
      : null;

  return (
    <article className="card hover-lift flex flex-col gap-4 p-4 sm:p-5">
      {/* -------- (1) Nature du trajet, urgence, remise ------------------- */}
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Tag
            tone="blue"
            icon={
              isTransport ? (
                <Truck className="h-3.5 w-3.5" strokeWidth={2.2} />
              ) : (
                <Home className="h-3.5 w-3.5" strokeWidth={2.2} />
              )
            }
          >
            {isTransport ? t.jobsComponents.feed.transport : t.newJob.moving}
          </Tag>

          {job.is_return_trip && (
            <Tag
              tone="blue"
              icon={<RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} />}
            >
              {t.jobsComponents.feed.returnTrip}
            </Tag>
          )}

          {isUrgent && (
            <Tag
              tone="orange"
              icon={<Zap className="h-3.5 w-3.5" strokeWidth={2.2} />}
            >
              {t.jobsComponents.feed.urgent}
            </Tag>
          )}
        </div>

        {/* La remise ferme la rangée, à droite : c'est la valeur de l'offre */}
        {remisePourcent != null && remisePourcent > 0 && (
          <DiscountBadge percent={remisePourcent} className="flex-shrink-0" />
        )}
      </header>

      {/* -------- (2) Ligne d'itinéraire ---------------------------------- */}
      <RouteLine
        from={job.pickup_address}
        to={job.dropoff_address}
        distance={distance}
      />

      {/* -------- (3) Tags de faits --------------------------------------- */}
      <div className="flex flex-wrap gap-2">
        <Tag
          tone="gray"
          icon={<Calendar className="h-3.5 w-3.5" strokeWidth={2.2} />}
        >
          {formatDate(job.scheduled_time, undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Tag>

        {isTransport ? (
          <>
            {job.specifications?.weight && (
              <Tag tone="gray">{`${job.specifications.weight} kg`}</Tag>
            )}
            {job.specifications?.volume && (
              <Tag tone="gray">{`${job.specifications.volume} m³`}</Tag>
            )}
          </>
        ) : (
          <>
            {job.specifications?.rooms && (
              <Tag tone="gray">
                {interpolate(t.jobsComponents.feed.rooms, {
                  n: job.specifications.rooms,
                })}
              </Tag>
            )}
            {job.specifications?.floor_pickup != null && (
              <Tag tone="gray">
                {interpolate(t.jobsComponents.feed.floor, {
                  n: job.specifications.floor_pickup,
                })}
              </Tag>
            )}
          </>
        )}

        {offerCount > 0 && (
          <Tag
            tone="gray"
            icon={<Users className="h-3.5 w-3.5" strokeWidth={2.2} />}
          >
            {interpolate(
              offerCount > 1
                ? t.jobsComponents.feed.offers
                : t.jobsComponents.feed.offer,
              { n: offerCount },
            )}
          </Tag>
        )}

        {/* L'économie garde sa base de comparaison : un montant nu ne serait
            pas vérifiable, donc pas crédible. */}
        {economie != null && base != null && (
          <Tag tone="green" className="tabular">
            <span data-testid="recherche-trajet-economie">
              {interpolate("Vous économisez {n} TND", { n: economie })}
            </span>
            <span
              data-testid="recherche-trajet-economie-base"
              className="font-semibold opacity-70"
            >
              {interpolate("· dédié {n} TND", { n: base })}
            </span>
          </Tag>
        )}
      </div>

      {/* -------- (4) Pied de carte : prix + action ----------------------- */}
      <footer className="flex items-end justify-between gap-4 border-t border-line pt-4">
        <div className="flex min-w-0 flex-col">
          {/* Ancien prix barré, AU-DESSUS du prix courant */}
          {base != null && remisePourcent != null && remisePourcent > 0 && (
            <span className="price-was">{base} TND</span>
          )}
          {prixCourant ? (
            <span className="price">
              {prixCourant}{" "}
              <span className="text-[13px] font-semibold text-ink-500">
                {t.jobsComponents.feed.tnd}
              </span>
            </span>
          ) : (
            <span className="text-[14px] font-semibold text-ink-300">
              {t.jobsComponents.feed.budgetUnspecified}
            </span>
          )}
        </div>

        <Link
          // Seul element navigable de la carte : le conteneur n'est pas
          // cliquable. Les parcours ciblaient la carte entiere et le clic
          // tombait a cote, sans erreur ni navigation.
          data-testid="job-card-ouvrir"
          href={urlJob(job.id, job.is_return_trip)}
          className="btn-base min-h-[44px] flex-shrink-0 rounded-cta bg-blue-700 px-4 text-[14.5px] text-white shadow-blue transition-colors duration-120 hover:bg-blue-800 active:translate-y-px"
        >
          {t.common.viewOffer}
        </Link>
      </footer>
    </article>
  );
}
