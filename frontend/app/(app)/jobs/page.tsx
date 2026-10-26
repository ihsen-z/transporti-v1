"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { formatDate, formatTND } from "@/lib/format";
import {
  Package,
  Search,
  Plus,
  Truck,
  Home,
  Loader2,
  Clock,
  CheckCircle,
  CalendarClock,
  ArrowRight,
  MapPin,
  Calendar,
  Wallet,
  TrendingUp,
  MessageSquare,
  Eye,
  RotateCcw,
  FileText,
  RefreshCw,
  Banknote,
} from "lucide-react";
import JobCard from "@/components/dashboard/JobCard";
import { useJobs } from "@/hooks/useJobs";
import { useAuth } from "@/hooks/useAuth";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import { getTransporterMissions } from "@/lib/services/jobs";
import { getTransporterStats } from "@/lib/services/stats";
import { useToast } from "@/components/ui/Toast";
import LoadingState from "@/components/ui/LoadingState";
import Pagination, { paginateArray } from "@/components/ui/Pagination";
import type { TransporterMission } from "@/lib/services/jobs";
import {
  getMySentRequests,
  ongletDeLaDemande,
  type OngletExpedition,
  type TripRequest,
} from "@/lib/services/tripRequests";
import { urlJob } from "@/lib/routes/jobs";

/* -------------------------------------------------------------------------- */
/*  Types & Helpers                                                            */
/* -------------------------------------------------------------------------- */

// T4.1 (lot 2) — segmentation par ce que la mission attend du transporteur.
//
// « À venir » (MATCHED) etait auparavant fondu dans « En cours » : or une
// mission acceptee mais pas demarree appelle une action differente — confirmer
// le depart — d une mission deja en route. Les melanger masquait ce qui
// attendait un geste.
//
// L onglet « Trajets retour » a ete retire : /retours (T1.3) porte desormais
// l inventaire, avec l edition, la prolongation et la depublication. Deux
// listes pour la meme chose, ce sont deux comptages a tenir d accord.
type MissionFilter = "ALL" | "UPCOMING" | "IN_PROGRESS" | "COMPLETED";

const MISSION_TABS: {
  id: MissionFilter;
  icon: React.ElementType;
}[] = [
  { id: "ALL", icon: FileText },
  { id: "UPCOMING", icon: CalendarClock },
  { id: "IN_PROGRESS", icon: Clock },
  { id: "COMPLETED", icon: CheckCircle },
];

const JOB_TYPE_CONFIG = {
  TRANSPORT: {
    icon: Truck,
    className: "bg-blue-50 text-blue-700",
  },
  MOVING: {
    icon: Home,
    className: "bg-blue-50 text-blue-700",
  },
};

function shortAddr(addr: string, max = 35): string {
  if (!addr || addr === "—") return addr;
  if (addr.length <= max) return addr;
  const parts = addr.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    const short = `${parts[0]}, ${parts[1]}`;
    return short.length <= max ? short : parts[0].slice(0, max) + "…";
  }
  return addr.slice(0, max) + "…";
}

function getStatusConfig(status: string) {
  const map: Record<string, { label: string; color: string; bgColor: string }> =
    {
      PUBLISHED: {
        label: "Publiée",
        color: "text-warning-700",
        bgColor: "bg-warning-50 border-warning-200",
      },
      MATCHED: {
        label: "Attribuée",
        color: "text-blue-700",
        bgColor: "bg-blue-50 border-blue-200",
      },
      IN_PROGRESS: {
        label: "En cours",
        color: "text-brand-700",
        bgColor: "bg-brand-600/5 border-brand-600/20",
      },
      COMPLETED: {
        label: "Terminée",
        color: "text-green-700",
        bgColor: "bg-green-50 border-green-200",
      },
      CANCELLED: {
        label: "Annulée",
        color: "text-neutral-500",
        bgColor: "bg-neutral-100 border-neutral-200",
      },
      DISPUTED: {
        label: "Litige",
        color: "text-error-700",
        bgColor: "bg-error-50 border-error-200",
      },
    };
  return (
    map[status] || {
      label: status,
      color: "text-neutral-600",
      bgColor: "bg-neutral-100 border-neutral-200",
    }
  );
}

/* -------------------------------------------------------------------------- */
/*  StatCard — Premium design matching Mes Offres                              */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
  valueColor,
  highlight = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor: string;
  valueColor: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm hover:shadow-lg transition-all duration-200 group ${
        highlight
          ? "bg-green-50 border-green-200"
          : "bg-white border-neutral-100"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColor} transition-transform`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className={`text-2xl font-bold ${valueColor} tracking-tight`}>
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  MissionCard — For transporter's assigned missions                          */
/* -------------------------------------------------------------------------- */

const MissionCard = React.memo(function MissionCardInner({
  mission,
}: {
  mission: TransporterMission;
}) {
  const { t } = useAppI18n();
  const typeConfig =
    JOB_TYPE_CONFIG[mission.job_type] || JOB_TYPE_CONFIG.TRANSPORT;
  const TypeIcon = typeConfig.icon;
  const typeLabel =
    mission.job_type === "MOVING"
      ? t.jobsList.typeMoving
      : t.jobsList.typeTransport;
  const statusConfig = getStatusConfig(mission.status);
  const statusLabel =
    (t.status.job as Record<string, string>)[mission.status] ??
    statusConfig.label;
  const isMuted =
    mission.status === "CANCELLED" || mission.status === "DISPUTED";

  return (
    <div
      className={`
      group bg-surface rounded-card border border-s-[3px] transition-all duration-200 p-5
      ${mission.status === "IN_PROGRESS" ? "border-s-brand-600 border-brand-600/20 hover:shadow-md hover:-translate-y-0.5" : ""}
      ${mission.status === "COMPLETED" ? "border-s-emerald-500 border-green-200 shadow-sm shadow-green-50" : ""}
      ${mission.is_return_trip ? "border-s-purple-400 border-blue-200" : ""}
      ${isMuted ? "border-s-neutral-300 border-neutral-200 opacity-70 hover:opacity-100" : ""}
      ${!mission.is_return_trip && mission.status !== "IN_PROGRESS" && mission.status !== "COMPLETED" && !isMuted ? "border-s-amber-400 border-neutral-100 hover:shadow-md hover:-translate-y-0.5" : ""}
    `}
    >
      {/* Header: Route + Status */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          {/* Return trip badge */}
          {mission.is_return_trip && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 mb-2">
              <RotateCcw className="w-3 h-3" />
              {t.jobsList.returnTripBadge}
            </span>
          )}

          {/* Route */}
          <div
            className="flex items-center gap-2 text-sm text-neutral-700 mb-1.5"
            title={`${mission.pickup_address} → ${mission.dropoff_address}`}
          >
            <MapPin className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span className="truncate font-medium">
              {shortAddr(mission.pickup_address)}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-300 flex-shrink-0 rtl:-scale-x-100" />
            <span className="truncate font-medium">
              {shortAddr(mission.dropoff_address)}
            </span>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(mission.scheduled_time, undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeConfig.className}`}
            >
              <TypeIcon className="w-3 h-3" />
              {typeLabel}
            </span>
            {!mission.is_return_trip && mission.client_name && (
              <span className="text-neutral-400">
                {interpolate(t.jobsList.client, { name: mission.client_name })}
              </span>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border flex-shrink-0 ${statusConfig.bgColor} ${statusConfig.color}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Price breakdown — only for non-return-trip missions */}
      {!mission.is_return_trip && mission.offer_price > 0 && (
        <div className="bg-neutral-50 rounded-xl p-3.5 mb-3 border border-line">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-neutral-400 mb-1">
                <Banknote className="w-3 h-3" />
                <p className="text-[10px] font-medium uppercase tracking-wider">
                  {t.jobsList.acceptedPrice}
                </p>
              </div>
              <p className="text-sm font-bold text-neutral-900">
                {mission.offer_price.toFixed(0)}{" "}
                <span className="text-xs font-medium text-neutral-500">
                  {t.jobsList.tnd}
                </span>
              </p>
            </div>
            <div className="border-x border-neutral-200 text-center">
              <div className="flex items-center justify-center gap-1 text-neutral-400 mb-1">
                <TrendingUp className="w-3 h-3" />
                <p className="text-[10px] font-medium uppercase tracking-wider">
                  {t.jobsList.commission}
                </p>
              </div>
              <p className="text-sm font-semibold text-error-500">
                -{mission.offer_commission.toFixed(0)}{" "}
                <span className="text-xs font-normal">{t.jobsList.tnd}</span>
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                <Wallet className="w-3 h-3" />
                <p className="text-[10px] font-medium uppercase tracking-wider">
                  {t.jobsList.netGain}
                </p>
              </div>
              <p className="text-sm font-bold text-green-600">
                {mission.offer_price_net.toFixed(0)}{" "}
                <span className="text-xs font-medium">{t.jobsList.tnd}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Capacity info for return trips */}
      {mission.is_return_trip && mission.available_capacity && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
          <Package className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <p className="text-xs text-blue-700 font-medium">
            {mission.available_capacity}
          </p>
        </div>
      )}

      {/* Footer: Actions */}
      <div className="flex items-center justify-end gap-1.5">
        <Link
          href={urlJob(mission.id, mission.is_return_trip)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-white hover:bg-brand-600 px-3 py-1.5 rounded-lg transition-all duration-200 border border-brand-600/20 hover:border-brand-600"
        >
          <Eye className="w-3.5 h-3.5" />
          {t.jobsList.details}
        </Link>

        {mission.status === "IN_PROGRESS" && (
          <Link
            href="/messages"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:text-white hover:bg-green-500 px-3 py-1.5 rounded-lg transition-all duration-200 border border-green-200 hover:border-green-500"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {t.jobsList.messages}
          </Link>
        )}
      </div>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*  TransporterMissionsView — The new Mes Missions page                       */
/* -------------------------------------------------------------------------- */

function TransporterMissionsView() {
  const { t } = useAppI18n();
  const { showToast } = useToast();
  const [missions, setMissions] = useState<TransporterMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // B2 — K4 (gains confirmés = escrow libéré) depuis la source unique
  const [confirmedEarnings, setConfirmedEarnings] = useState<number | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<MissionFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchMissions = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setRefreshing(true);
        // getTransporterMissions existait dans lib/services/jobs.ts sans
        // aucun appelant : cet ecran refaisait l'appel en ligne.
        setMissions((await getTransporterMissions()).data);
        // K4 vient de l'endpoint canonique (contrat stats.py), non bloquant.
        void getTransporterStats().then((s) =>
          setConfirmedEarnings(s ? s.earnings_confirmed : null),
        );
      } catch (e) {
        console.error("Failed to fetch missions:", e);
        if (!silent) showToast("error", t.jobsList.loadError);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast, t],
  );

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  // Filter
  const filtered = useMemo(() => {
    let list = missions;

    // Tab filter
    if (activeTab === "UPCOMING")
      list = list.filter((m) => m.status === "MATCHED");
    else if (activeTab === "IN_PROGRESS")
      list = list.filter((m) => m.status === "IN_PROGRESS");
    else if (activeTab === "COMPLETED")
      list = list.filter((m) => m.status === "COMPLETED");

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.pickup_address.toLowerCase().includes(q) ||
          m.dropoff_address.toLowerCase().includes(q) ||
          m.client_name.toLowerCase().includes(q),
      );
    }

    return list;
  }, [missions, activeTab, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const paginatedMissions = paginateArray(filtered, currentPage, PAGE_SIZE);

  // Stats
  // MATCHED est desormais compte par « A venir » : le laisser ici ferait
  // compter deux fois la meme mission entre les deux onglets.
  const inProgressCount = missions.filter(
    (m) => m.status === "IN_PROGRESS",
  ).length;
  const completedCount = missions.filter(
    (m) => m.status === "COMPLETED",
  ).length;
  const upcomingCount = missions.filter((m) => m.status === "MATCHED").length;
  // Local fallback only — the card prefers K4 (earnings_confirmed) from the
  // canonical stats endpoint (B2).
  const totalEarnings = missions
    .filter((m) => m.status === "COMPLETED" && !m.is_return_trip)
    .reduce((sum, m) => sum + m.offer_price_net, 0);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-[14px] text-ink-500">{t.jobsList.loading}</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="w-16 h-16 bg-brand-600/5 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[14px] text-ink-500">{t.jobsList.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/retours/nouveau"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <RotateCcw className="w-4 h-4" />
            {t.jobsList.proposeReturnTrip}
          </Link>
          <button
            onClick={() => fetchMissions()}
            disabled={refreshing}
            className="p-2.5 text-neutral-400 hover:text-brand-600 hover:bg-brand-600/5 rounded-xl transition-all disabled:opacity-50 group"
            title={t.jobsList.refresh}
          >
            <RefreshCw
              className={`w-5 h-5 group-hover:rotate-180 transition-transform duration-500 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={FileText}
          label={t.jobsList.statTotal}
          value={String(missions.length)}
          iconColor="bg-blue-50 text-blue-700"
          valueColor="text-neutral-900"
        />
        <StatCard
          icon={Clock}
          label={t.jobsList.statInProgress}
          value={String(inProgressCount)}
          iconColor="bg-warning-100 text-warning-600"
          valueColor="text-warning-600"
        />
        <StatCard
          icon={CheckCircle}
          label={t.jobsList.statCompleted}
          value={String(completedCount)}
          iconColor="bg-green-100 text-green-600"
          valueColor="text-green-600"
        />
        <StatCard
          icon={Wallet}
          label={t.jobsList.statEarnings}
          value={formatTND(confirmedEarnings ?? totalEarnings)}
          iconColor="bg-green-100 text-green-600"
          valueColor="text-green-700"
          highlight
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-brand-600/[0.03] rounded-2xl p-1.5 mb-4 overflow-x-auto">
        {MISSION_TABS.map((tab) => {
          const count =
            tab.id === "ALL"
              ? missions.length
              : tab.id === "UPCOMING"
                ? upcomingCount
                : tab.id === "IN_PROGRESS"
                  ? inProgressCount
                  : completedCount;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? "bg-white text-brand-600 shadow-sm ring-1 ring-brand-600/10"
                  : count === 0
                    ? "text-neutral-300 hover:text-neutral-400 hover:bg-white/30"
                    : "text-neutral-500 hover:text-neutral-700 hover:bg-white/50"
              }`}
            >
              <tab.icon
                className={`w-4 h-4 ${isActive ? "text-brand-600" : ""}`}
              />
              {tab.id === "ALL"
                ? t.jobsList.tabAll
                : tab.id === "UPCOMING"
                  ? t.jobsList.tabUpcoming
                  : tab.id === "IN_PROGRESS"
                    ? t.jobsList.tabInProgress
                    : t.jobsList.tabCompleted}
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive
                    ? "bg-accent-500/10 text-accent-600"
                    : count === 0
                      ? "bg-neutral-100 text-neutral-300"
                      : "bg-neutral-200/70 text-neutral-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t.jobsList.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full ps-10 pe-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-700/20 focus:border-brand-600 outline-none transition-all"
          />
        </div>
      </div>

      {/* Mission List */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-card shadow-card shadow-sm">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="absolute inset-0 bg-blue-50 rounded-2xl rotate-6" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Search className="w-10 h-10 text-brand-600 -rotate-6" />
              </div>
            </div>
            <p className="text-neutral-700 font-semibold mb-1">
              {t.jobsList.emptyMissionsTitle}
            </p>
            <p className="text-sm text-neutral-400 max-w-md mx-auto">
              {t.jobsList.emptyMissionsDesc}
            </p>
            <div className="flex gap-3 justify-center mt-5">
              <Link
                href="/demandes"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 px-5 py-2.5 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                {t.jobsList.findMission}
                <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
              </Link>
              {/* La publication d'un retour vit sur /retours/nouveau depuis
                  T1.3 : cet ecran ne porte plus que les missions executees. */}
              <Link
                href="/retours/nouveau"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-5 py-2.5 rounded-xl transition-all border border-blue-200"
              >
                <RotateCcw className="w-4 h-4" />
                {t.jobsList.proposeTrip}
              </Link>
            </div>
          </div>
        ) : (
          paginatedMissions.map((mission, index) => (
            <div
              key={mission.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <MissionCard mission={mission} />
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ClientJobsView — Original client view (unchanged from before)             */
/* -------------------------------------------------------------------------- */

function ClientJobsView() {
  const { t } = useAppI18n();
  const { data: jobs, loading } = useJobs();
  const [clientPage, setClientPage] = useState(1);
  const CLIENT_PAGE_SIZE = 10;

  // C2.1 — les demandes envoyees sur des trajets retour. `trip-requests/my/`
  // existait cote backend mais n etait consomme nulle part : un client ayant
  // envoye une demande n en avait AUCUNE liste et devait se souvenir du trajet
  // pour la retrouver. Sans elles, cet ecran ne montrerait que les demandes
  // classiques — donc tout sauf le parcours que le pivot met en avant.
  const [demandesEnvoyees, setDemandesEnvoyees] = useState<TripRequest[]>([]);
  const [ongletExpedition, setOngletExpedition] =
    useState<OngletExpedition>("attente");

  useEffect(() => {
    let annule = false;
    void getMySentRequests()
      .then((liste) => {
        if (!annule) setDemandesEnvoyees(liste);
      })
      // L echec ne doit pas vider l ecran : les demandes classiques restent
      // affichees, seules les demandes sur trajets retour manquent.
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, []);

  // Le tri primaire est « qui doit agir maintenant », pas la date. Un job
  // classique attend une offre tant qu il est PUBLISHED ; ensuite il suit son
  // execution.
  const ongletDuJob = (statut: string): OngletExpedition => {
    if (statut === "PUBLISHED" || statut === "DRAFT") return "attente";
    if (statut === "MATCHED") return "a-payer";
    if (statut === "IN_PROGRESS") return "en-cours";
    return "terminees";
  };

  const jobsDeLOnglet = jobs.filter(
    (j) => ongletDuJob(j.status) === ongletExpedition,
  );
  const demandesDeLOnglet = demandesEnvoyees.filter(
    (d) => ongletDeLaDemande(d) === ongletExpedition,
  );

  const compteur = (cle: OngletExpedition) =>
    jobs.filter((j) => ongletDuJob(j.status) === cle).length +
    demandesEnvoyees.filter((d) => ongletDeLaDemande(d) === cle).length;

  const ONGLETS_EXPEDITION: { cle: OngletExpedition; label: string }[] = [
    { cle: "attente", label: "En attente de reponse" },
    { cle: "negociation", label: "En negociation" },
    { cle: "a-payer", label: "A payer" },
    { cle: "en-cours", label: "En cours" },
    { cle: "terminees", label: "Terminees" },
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingState variant="page" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <p className="text-[14.5px] leading-[1.55] text-ink-500">
            {t.jobsList.clientSubtitle}
          </p>
        </div>
        <Link
          href="/demandes/nouvelle"
          className="bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3 rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {t.jobsList.newTransport}
        </Link>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface rounded-tile shadow-card p-4 text-center">
          <p className="text-[21px] font-extrabold tracking-heading text-ink-900">
            {jobs.length}
          </p>
          <p className="text-sm text-neutral-600">
            {t.jobsList.clientStatTotal}
          </p>
        </div>
        <div className="bg-surface rounded-tile shadow-card p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">
            {jobs.filter((j) => j.status === "PUBLISHED").length}
          </p>
          <p className="text-sm text-neutral-600">
            {t.jobsList.clientStatPublished}
          </p>
        </div>
        <div className="bg-surface rounded-tile shadow-card p-4 text-center">
          <p className="text-2xl font-bold text-accent-600">
            {jobs.filter((j) => j.status === "IN_PROGRESS").length}
          </p>
          <p className="text-sm text-neutral-600">
            {t.jobsList.clientStatInProgress}
          </p>
        </div>
        <div className="bg-surface rounded-tile shadow-card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {jobs.filter((j) => j.status === "COMPLETED").length}
          </p>
          <p className="text-sm text-neutral-600">
            {t.jobsList.clientStatCompleted}
          </p>
        </div>
      </div>

      {/* C2.1 — onglets ordonnes par qui doit agir. « En negociation » porte
          les contre-propositions qui attendent la decision du client : c est
          ce qu il doit voir en premier. */}
      <div
        role="tablist"
        aria-label="Filtrer mes expeditions"
        className="flex flex-wrap gap-2 mb-6"
      >
        {ONGLETS_EXPEDITION.map(({ cle, label }) => {
          const actif = ongletExpedition === cle;
          const n = compteur(cle);
          return (
            <button
              key={cle}
              type="button"
              role="tab"
              aria-selected={actif}
              data-testid={`expeditions-onglet-${cle}`}
              onClick={() => setOngletExpedition(cle)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border focus-visible:ring-2 focus-visible:ring-blue-700/30 outline-none ${
                actif
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              {label}
              {n > 0 && <span className="ms-2 tabular-nums">· {n}</span>}
            </button>
          );
        })}
      </div>

      {/* Demandes envoyees sur des trajets retour, dans l onglet courant. */}
      {demandesDeLOnglet.length > 0 && (
        <div className="flex flex-col gap-3 mb-4">
          {demandesDeLOnglet.map((demande) => (
            <Link
              key={`req-${demande.id}`}
              href={urlJob(demande.job, true)}
              data-testid="expeditions-ligne"
              className="block bg-surface rounded-card shadow-card p-4 hover:border-brand-600/40 focus-visible:ring-2 focus-visible:ring-blue-700/30 outline-none"
            >
              <p className="font-semibold text-neutral-900">
                {demande.job_pickup} → {demande.job_dropoff}
              </p>
              <p className="text-sm text-neutral-500 mt-1">
                {demande.status === "COUNTERED" && demande.counter_price
                  ? `Contre-proposition : ${demande.counter_price} DT — a accepter`
                  : `Votre proposition : ${demande.proposed_price} DT`}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* Jobs List */}
      {jobsDeLOnglet.length === 0 && demandesDeLOnglet.length === 0 ? (
        <div className="bg-surface rounded-card shadow-card p-12 text-center">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-[17px] font-extrabold tracking-heading text-ink-900 mb-2">
            {t.jobsList.clientEmptyTitle}
          </h3>
          <p className="text-neutral-600 mb-4">{t.jobsList.clientEmptyDesc}</p>
          <Link
            href="/demandes/nouvelle"
            className="bg-brand-700 hover:bg-brand-800 text-white font-medium px-6 py-2 rounded-lg transition-colors inline-block"
          >
            {t.jobsList.clientEmptyCta}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {paginateArray(jobsDeLOnglet, clientPage, CLIENT_PAGE_SIZE).map(
            (job) => (
              <div key={job.id} data-testid="expeditions-ligne">
                <JobCard job={job} />
              </div>
            ),
          )}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={clientPage}
        totalItems={jobsDeLOnglet.length}
        pageSize={CLIENT_PAGE_SIZE}
        onPageChange={setClientPage}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page — Role-aware routing                                                  */
/* -------------------------------------------------------------------------- */

export default function JobsListPage() {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();

  if (role === "TRANSPORTER") {
    return <TransporterMissionsView />;
  }

  return <ClientJobsView />;
}
