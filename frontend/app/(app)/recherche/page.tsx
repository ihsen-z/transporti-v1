"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api/client";
import {
  createCorridorAlert,
  deleteCorridorAlert,
  getCorridorAlerts,
  searchReturnTrips,
  type AlerteCorridor,
} from "@/lib/services/search";
import type { JobFeedItem } from "@/components/jobs/JobFeedCard";
import { JobFeedCard } from "@/components/jobs/JobFeedCard";
import { BandHeroCard } from "@/components/dashboard/BandHeroCard";
import { useToast } from "@/components/ui/Toast";
import {
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  SortAsc,
  MapPin,
  Truck,
  TrendingDown,
  PlusCircle,
  Bell,
} from "lucide-react";

const PAGE_SIZE = 10;

const GOVERNORATES = [
  "Tunis",
  "Ariana",
  "Ben Arous",
  "Manouba",
  "Nabeul",
  "Zaghouan",
  "Bizerte",
  "Béja",
  "Jendouba",
  "Le Kef",
  "Siliana",
  "Sousse",
  "Monastir",
  "Mahdia",
  "Sfax",
  "Kairouan",
  "Kasserine",
  "Sidi Bouzid",
  "Gabès",
  "Médenine",
  "Tataouine",
  "Gafsa",
  "Tozeur",
  "Kébili",
];

export default function ReturnTripsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useAppI18n();
  // Type permissif herite de JobFeedItem : le durcir fait tomber une cascade
  // sur une quinzaine de champs et merite son propre chantier.
  const [jobs, setJobs] = useState<JobFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">(
    "newest",
  );
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    pickup_governorate: searchParams?.get("pickup_governorate") || "",
    dropoff_governorate: searchParams?.get("dropoff_governorate") || "",
  });
  const { showToast } = useToast();
  const [alertLoading, setAlertLoading] = useState(false);
  // Sprint 5 — client's active corridor alerts (list + delete)
  const [myAlerts, setMyAlerts] = useState<AlerteCorridor[]>([]);

  const fetchMyAlerts = async () => {
    if (user?.role?.toUpperCase() !== "CLIENT") return;
    try {
      // Le service rend une liste vide en cas d'echec : le bloc des alertes
      // est facultatif et ne doit pas priver le client des resultats.
      setMyAlerts(await getCorridorAlerts());
    } catch (_e) {
      /* silencieux — bloc optionnel */
    }
  };

  useEffect(() => {
    if (!authLoading) fetchMyAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const handleDeleteAlert = async (id: number) => {
    try {
      await deleteCorridorAlert(id);
      setMyAlerts((prev) => prev.filter((a) => a.id !== id));
      showToast("success", t.returnTrips.alertDeleted);
    } catch (_e) {
      showToast("error", t.returnTrips.alertError);
    }
  };

  // REC-P5 — corridor alert subscription (funnel fallback)
  const handleCreateAlert = async () => {
    setAlertLoading(true);
    try {
      await createCorridorAlert(
        filters.pickup_governorate,
        filters.dropoff_governorate,
      );
      showToast("success", t.returnTrips.alertCreated);
      fetchMyAlerts();
    } catch (error) {
      if (error instanceof ApiError && error.body?.error) {
        showToast("error", String(error.body.error));
      } else {
        showToast("error", t.returnTrips.alertError);
      }
    } finally {
      setAlertLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    fetchReturnTrips();
  }, [filters, currentPage, sortBy]);

  // Numero de la requete en cours. Les filtres se declenchent a chaque frappe
  // ou changement de select : deux requetes partent coup sur coup et rien ne
  // garantissait leur ordre d'arrivee. La plus lente ecrasait la plus recente,
  // et l'ecran affichait les resultats du filtre PRECEDENT — un corridor sans
  // trajet montrait ceux d'un autre, au lieu de l'etat vide et de ses deux
  // sorties. Le compteur fait ignorer toute reponse qui n'est plus la derniere
  // demandee.
  const requeteCourante = useRef(0);

  const fetchReturnTrips = async () => {
    const numero = requeteCourante.current + 1;
    requeteCourante.current = numero;
    const estPerimee = () => requeteCourante.current !== numero;

    setLoading(true);
    try {
      const resultats = await searchReturnTrips({
        pickup_governorate: filters.pickup_governorate,
        dropoff_governorate: filters.dropoff_governorate,
        page: currentPage,
        pageSize: PAGE_SIZE,
        tri: sortBy,
      });

      if (estPerimee()) return;

      setJobs(resultats.trajets);
      setTotalCount(resultats.total);
    } catch (error) {
      if (estPerimee()) return;
      console.error("Error fetching return trips:", error);
    } finally {
      // Une reponse perimee ne doit pas non plus eteindre l'indicateur de
      // chargement de la requete qui, elle, est encore en vol.
      if (!estPerimee()) setLoading(false);
    }
  };

  if (authLoading)
    return <div className="p-8 text-center">{t.common.loading}</div>;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-10 pt-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4">
        {/* Carte verre chevauchant le bandeau : la promesse du pivot */}
        <BandHeroCard>
          <div className="flex items-center gap-3">
            <span className="glass-chip h-11 w-11 flex-shrink-0">
              <RotateCcw className="h-5 w-5 text-white" strokeWidth={2} />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="text-[19px] font-extrabold tracking-heading text-white">
                {t.returnTrips.title}
              </h2>
              <p className="text-[13px] text-on-blue-300">
                {t.returnTrips.subtitle}
              </p>
            </div>
          </div>

          {/* Les trois arguments passent en tags de verre */}
          <div className="flex flex-wrap gap-2">
            <span className="tag tag--on-blue">
              <TrendingDown className="h-3.5 w-3.5" strokeWidth={2.2} />
              {t.returnTrips.discount}
            </span>
            <span className="tag tag--on-blue">
              <Truck className="h-3.5 w-3.5" strokeWidth={2.2} />
              {t.returnTrips.verified}
            </span>
            <span className="tag tag--on-blue">
              <MapPin className="h-3.5 w-3.5" strokeWidth={2.2} />
              {t.returnTrips.allTunisia}
            </span>
          </div>
        </BandHeroCard>

        <div className="flex flex-col gap-4 md:flex-row">
          {/* Sidebar Filters */}
          <div className="w-full flex-shrink-0 md:w-64">
            <div className="card sticky top-5 flex flex-col gap-4 p-5">
              <h3 className="flex items-center gap-2 text-[15.5px] font-extrabold tracking-heading text-ink-900">
                <Search className="h-4 w-4 text-blue-700" strokeWidth={2.2} />
                {t.returnTrips.filter}
              </h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="label mb-[7px]">
                    {t.returnTrips.departure}
                  </label>
                  <select
                    data-testid="recherche-depart"
                    value={filters.pickup_governorate}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        pickup_governorate: e.target.value,
                      }))
                    }
                    className="field"
                  >
                    <option value="">{t.returnTrips.allGovernorates}</option>
                    {GOVERNORATES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label mb-[7px]">
                    {t.returnTrips.destination}
                  </label>
                  <select
                    data-testid="recherche-arrivee"
                    value={filters.dropoff_governorate}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        dropoff_governorate: e.target.value,
                      }))
                    }
                    className="field"
                  >
                    <option value="">{t.returnTrips.allGovernorates}</option>
                    {GOVERNORATES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                {(filters.pickup_governorate ||
                  filters.dropoff_governorate) && (
                  <button
                    onClick={() =>
                      setFilters({
                        pickup_governorate: "",
                        dropoff_governorate: "",
                      })
                    }
                    className="text-start text-[13px] font-bold text-blue-700 underline-offset-4 transition-colors hover:underline"
                  >
                    {t.returnTrips.resetFilters}
                  </button>
                )}
              </div>

              {/* Sprint 5 — client's active corridor alerts */}
              {myAlerts.length > 0 && (
                <div className="mt-5 pt-4 border-t border-line">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5" />
                    {t.returnTrips.myAlerts}
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {myAlerts.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between text-xs bg-blue-50 rounded-tile px-2.5 py-1.5"
                      >
                        <span className="text-blue-700 font-medium truncate">
                          {a.pickup_governorate} → {a.dropoff_governorate}
                        </span>
                        <button
                          onClick={() => handleDeleteAlert(a.id)}
                          className="text-neutral-400 hover:text-error-500 ms-2 flex-shrink-0"
                          title={t.returnTrips.deleteAlert}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Main Feed */}
          <div className="flex-1 animate-fade-in-up delay-200">
            <div className="mb-6 flex justify-between items-center">
              <span className="text-sm text-neutral-500">
                {totalCount}{" "}
                {totalCount > 1
                  ? t.returnTrips.countPlural
                  : t.returnTrips.count}
              </span>
              <div className="flex items-center gap-2">
                <SortAsc className="h-4 w-4 text-ink-300" strokeWidth={2} />
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as "newest" | "price_asc" | "price_desc",
                    )
                  }
                  className="field h-11 min-h-[44px] w-auto text-[13px]"
                >
                  <option value="newest">{t.returnTrips.sortNewest}</option>
                  <option value="price_asc">
                    {t.returnTrips.sortPriceAsc}
                  </option>
                  <option value="price_desc">
                    {t.returnTrips.sortPriceDesc}
                  </option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-44 rounded-card" />
                ))}
              </div>
            ) : jobs.length > 0 ? (
              <>
                <div
                  data-testid="recherche-resultats"
                  className="flex flex-col gap-4"
                >
                  {jobs.map((job, index) => (
                    <div
                      key={job.id}
                      data-testid="recherche-trajet"
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <JobFeedCard job={job} />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="grid h-11 w-11 place-items-center rounded-chip border border-line bg-surface text-ink-500 transition-colors hover:border-blue-700 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="w-5 h-5 rtl:-scale-x-100" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2)
                        pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-11 w-11 rounded-chip text-[14px] font-bold transition-colors duration-120 ${
                            currentPage === pageNum
                              ? "bg-blue-700 text-white shadow-blue"
                              : "border border-line bg-surface text-ink-500 hover:border-blue-700 hover:text-blue-700"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="grid h-11 w-11 place-items-center rounded-chip border border-line bg-surface text-ink-500 transition-colors hover:border-blue-700 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="w-5 h-5 rtl:-scale-x-100" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div
                data-testid="recherche-repli"
                className="card animate-fade-in-up p-8 text-center sm:p-12"
              >
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-blue-50">
                  <RotateCcw
                    className="h-7 w-7 text-blue-700"
                    strokeWidth={2}
                  />
                </div>
                <h3 className="mb-2 text-[17px] font-extrabold tracking-heading text-ink-900">
                  {t.returnTrips.noTrips}
                </h3>
                <p className="mx-auto mb-6 max-w-md text-[14.5px] leading-[1.55] text-ink-500">
                  {t.returnTrips.noTripsDesc}
                </p>
                {/* Funnel fallback (pivot §5.2, cas B) : jamais de cul-de-sac */}
                <div className="flex flex-wrap justify-center gap-3">
                  <Link
                    data-testid="recherche-repli-publier"
                    href={`/demandes/nouvelle?pickup_governorate=${encodeURIComponent(filters.pickup_governorate)}&dropoff_governorate=${encodeURIComponent(filters.dropoff_governorate)}`}
                    className="btn-base min-h-[48px] rounded-cta bg-blue-700 px-5 text-[15px] text-white shadow-blue transition-colors hover:bg-blue-800 active:translate-y-px"
                  >
                    <PlusCircle className="w-4 h-4" />
                    {t.returnTrips.publishFallback}
                  </Link>
                  {filters.pickup_governorate &&
                    filters.dropoff_governorate && (
                      <button
                        data-testid="recherche-repli-alerte"
                        onClick={handleCreateAlert}
                        disabled={alertLoading}
                        className="btn-base min-h-[48px] rounded-cta border border-line-strong bg-surface px-5 text-[15px] text-ink-900 transition-colors hover:border-blue-700 hover:bg-app active:translate-y-px disabled:opacity-50"
                      >
                        <Bell className="w-4 h-4" />
                        {alertLoading
                          ? t.common.loading
                          : t.returnTrips.createAlert}
                      </button>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
