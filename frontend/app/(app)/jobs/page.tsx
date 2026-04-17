"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  Plus,
  Truck,
  Home,
  Loader2,
  Clock,
  CheckCircle,
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
  AlertCircle,
} from "lucide-react";
import JobCard from "@/components/dashboard/JobCard";
import { useJobs } from "@/hooks/useJobs";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import LoadingState from "@/components/ui/LoadingState";
import Pagination, { paginateArray } from "@/components/ui/Pagination";
import type { TransporterMission } from "@/lib/services/jobs";

/* -------------------------------------------------------------------------- */
/*  Types & Helpers                                                            */
/* -------------------------------------------------------------------------- */

type MissionFilter = "ALL" | "IN_PROGRESS" | "COMPLETED" | "RETURN_TRIP";

const MISSION_TABS: {
  id: MissionFilter;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "ALL", label: "Toutes", icon: FileText },
  { id: "IN_PROGRESS", label: "En cours", icon: Clock },
  { id: "COMPLETED", label: "Terminées", icon: CheckCircle },
  { id: "RETURN_TRIP", label: "Trajets retour", icon: RotateCcw },
];

const JOB_TYPE_CONFIG = {
  TRANSPORT: {
    label: "Transport",
    icon: Truck,
    className: "bg-brand-600/5 text-brand-600",
  },
  MOVING: {
    label: "Déménagement",
    icon: Home,
    className: "bg-purple-50 text-purple-600",
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
        color: "text-amber-700",
        bgColor: "bg-amber-50 border-amber-200",
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
        color: "text-emerald-700",
        bgColor: "bg-emerald-50 border-emerald-200",
      },
      CANCELLED: {
        label: "Annulée",
        color: "text-neutral-500",
        bgColor: "bg-neutral-100 border-neutral-200",
      },
      DISPUTED: {
        label: "Litige",
        color: "text-red-700",
        bgColor: "bg-red-50 border-red-200",
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
      className={`rounded-2xl border p-4 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-200 group ${
        highlight
          ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-200"
          : "bg-white border-neutral-100"
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColor} transition-transform group-hover:scale-110`}
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

function MissionCard({ mission }: { mission: TransporterMission }) {
  const typeConfig =
    JOB_TYPE_CONFIG[mission.job_type] || JOB_TYPE_CONFIG.TRANSPORT;
  const TypeIcon = typeConfig.icon;
  const statusConfig = getStatusConfig(mission.status);
  const isMuted =
    mission.status === "CANCELLED" || mission.status === "DISPUTED";

  return (
    <div
      className={`
      group bg-white rounded-2xl border border-l-[3px] transition-all duration-200 p-5
      ${mission.status === "IN_PROGRESS" ? "border-l-brand-600 border-brand-600/20 hover:shadow-md hover:-translate-y-0.5" : ""}
      ${mission.status === "COMPLETED" ? "border-l-emerald-500 border-emerald-200 shadow-sm shadow-emerald-50" : ""}
      ${mission.is_return_trip ? "border-l-purple-400 border-purple-200" : ""}
      ${isMuted ? "border-l-neutral-300 border-neutral-200 opacity-70 hover:opacity-100" : ""}
      ${!mission.is_return_trip && mission.status !== "IN_PROGRESS" && mission.status !== "COMPLETED" && !isMuted ? "border-l-amber-400 border-neutral-100 hover:shadow-md hover:-translate-y-0.5" : ""}
    `}
    >
      {/* Header: Route + Status */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          {/* Return trip badge */}
          {mission.is_return_trip && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-600 mb-2">
              <RotateCcw className="w-3 h-3" />
              Trajet retour
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
            <ArrowRight className="w-3.5 h-3.5 text-neutral-300 flex-shrink-0" />
            <span className="truncate font-medium">
              {shortAddr(mission.dropoff_address)}
            </span>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(mission.scheduled_time).toLocaleDateString("fr-TN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${typeConfig.className}`}
            >
              <TypeIcon className="w-3 h-3" />
              {typeConfig.label}
            </span>
            {!mission.is_return_trip && mission.client_name && (
              <span className="text-neutral-400">
                Client : {mission.client_name}
              </span>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border flex-shrink-0 ${statusConfig.bgColor} ${statusConfig.color}`}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Price breakdown — only for non-return-trip missions */}
      {!mission.is_return_trip && mission.offer_price > 0 && (
        <div className="bg-neutral-50 rounded-xl p-3.5 mb-3 border border-neutral-100">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-neutral-400 mb-1">
                <Banknote className="w-3 h-3" />
                <p className="text-[10px] font-medium uppercase tracking-wider">
                  Prix accepté
                </p>
              </div>
              <p className="text-sm font-bold text-neutral-900">
                {mission.offer_price.toFixed(0)}{" "}
                <span className="text-xs font-medium text-neutral-500">
                  TND
                </span>
              </p>
            </div>
            <div className="border-x border-neutral-200 text-center">
              <div className="flex items-center justify-center gap-1 text-neutral-400 mb-1">
                <TrendingUp className="w-3 h-3" />
                <p className="text-[10px] font-medium uppercase tracking-wider">
                  Commission
                </p>
              </div>
              <p className="text-sm font-semibold text-red-500">
                -{mission.offer_commission.toFixed(0)}{" "}
                <span className="text-xs font-normal">TND</span>
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-500 mb-1">
                <Wallet className="w-3 h-3" />
                <p className="text-[10px] font-medium uppercase tracking-wider">
                  Gain net
                </p>
              </div>
              <p className="text-sm font-bold text-emerald-600">
                {mission.offer_price_net.toFixed(0)}{" "}
                <span className="text-xs font-medium">TND</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Capacity info for return trips */}
      {mission.is_return_trip && mission.available_capacity && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-purple-50 rounded-xl border border-purple-100">
          <Package className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
          <p className="text-xs text-purple-600 font-medium">
            {mission.available_capacity}
          </p>
        </div>
      )}

      {/* Footer: Actions */}
      <div className="flex items-center justify-end gap-1.5">
        <Link
          href={`/jobs/${mission.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-white hover:bg-brand-600 px-3 py-1.5 rounded-lg transition-all duration-200 border border-brand-600/20 hover:border-brand-600"
        >
          <Eye className="w-3.5 h-3.5" />
          Détails
        </Link>

        {mission.status === "IN_PROGRESS" && (
          <Link
            href="/messages"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-white hover:bg-emerald-500 px-3 py-1.5 rounded-lg transition-all duration-200 border border-emerald-200 hover:border-emerald-500"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Messages
          </Link>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  TransporterMissionsView — The new Mes Missions page                       */
/* -------------------------------------------------------------------------- */

function TransporterMissionsView() {
  const { showToast } = useToast();
  const [missions, setMissions] = useState<TransporterMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<MissionFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchMissions = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setRefreshing(true);
        const data = await apiClient.get<
          TransporterMission[] | { results: TransporterMission[] }
        >("/api/jobs/transporter/");
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setMissions(list);
      } catch (e) {
        console.error("Failed to fetch missions:", e);
        if (!silent) showToast("error", "Impossible de charger vos missions.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  // Filter
  const filtered = useMemo(() => {
    let list = missions;

    // Tab filter
    if (activeTab === "IN_PROGRESS")
      list = list.filter(
        (m) => m.status === "IN_PROGRESS" || m.status === "MATCHED",
      );
    else if (activeTab === "COMPLETED")
      list = list.filter((m) => m.status === "COMPLETED");
    else if (activeTab === "RETURN_TRIP")
      list = list.filter((m) => m.is_return_trip);

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
  const inProgressCount = missions.filter(
    (m) => m.status === "IN_PROGRESS" || m.status === "MATCHED",
  ).length;
  const completedCount = missions.filter(
    (m) => m.status === "COMPLETED",
  ).length;
  const returnTripCount = missions.filter((m) => m.is_return_trip).length;
  const totalEarnings = missions
    .filter((m) => m.status === "COMPLETED" && !m.is_return_trip)
    .reduce((sum, m) => sum + m.offer_price_net, 0);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Mes Missions
          </h1>
          <p className="text-neutral-500 mt-1">Chargement...</p>
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
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Mes Missions
          </h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Suivez vos missions assignées et gérez vos trajets retour.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/jobs/return-trip"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5"
          >
            <RotateCcw className="w-4 h-4" />
            Proposer un trajet retour
          </Link>
          <button
            onClick={() => fetchMissions()}
            disabled={refreshing}
            className="p-2.5 text-neutral-400 hover:text-brand-600 hover:bg-brand-600/5 rounded-xl transition-all disabled:opacity-50 group"
            title="Rafraîchir"
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
          label="Total"
          value={String(missions.filter((m) => !m.is_return_trip).length)}
          iconColor="bg-brand-600/10 text-brand-600"
          valueColor="text-neutral-900"
        />
        <StatCard
          icon={Clock}
          label="En cours"
          value={String(inProgressCount)}
          iconColor="bg-amber-100 text-amber-600"
          valueColor="text-amber-600"
        />
        <StatCard
          icon={CheckCircle}
          label="Terminées"
          value={String(completedCount)}
          iconColor="bg-emerald-100 text-emerald-600"
          valueColor="text-emerald-600"
        />
        <StatCard
          icon={Wallet}
          label="Gains totaux"
          value={`${totalEarnings.toFixed(0)} TND`}
          iconColor="bg-emerald-100 text-emerald-600"
          valueColor="text-emerald-700"
          highlight
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-brand-600/[0.03] rounded-2xl p-1.5 mb-4 overflow-x-auto">
        {MISSION_TABS.map((tab) => {
          const count =
            tab.id === "ALL"
              ? missions.length
              : tab.id === "IN_PROGRESS"
                ? inProgressCount
                : tab.id === "COMPLETED"
                  ? completedCount
                  : returnTripCount;
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
              {tab.label}
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
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par adresse ou client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 outline-none transition-all"
          />
        </div>
      </div>

      {/* Mission List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-neutral-100 shadow-sm">
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-accent-500/10 rounded-2xl rotate-6" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Search className="w-10 h-10 text-brand-600 -rotate-6" />
              </div>
            </div>
            <p className="text-neutral-700 font-semibold mb-1">
              {activeTab === "RETURN_TRIP"
                ? "Aucun trajet retour publié."
                : "Aucune mission pour le moment."}
            </p>
            <p className="text-sm text-neutral-400 max-w-md mx-auto">
              {activeTab === "RETURN_TRIP"
                ? "Proposez un trajet retour pour éviter les retours à vide."
                : "Parcourez les missions disponibles pour soumettre vos offres."}
            </p>
            <div className="flex gap-3 justify-center mt-5">
              <Link
                href="/jobs/browse"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-accent-500 hover:bg-accent-600 px-5 py-2.5 rounded-xl transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                Trouver une mission
                <ArrowRight className="w-4 h-4" />
              </Link>
              {activeTab === "RETURN_TRIP" && (
                <Link
                  href="/jobs/new?return_trip=true"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-5 py-2.5 rounded-xl transition-all border border-purple-200"
                >
                  <RotateCcw className="w-4 h-4" />
                  Proposer un trajet
                </Link>
              )}
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
  const { data: jobs, loading } = useJobs();
  const [clientPage, setClientPage] = useState(1);
  const CLIENT_PAGE_SIZE = 10;

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
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Mes Transports
          </h1>
          <p className="text-neutral-600">
            Gérez et suivez tous vos transports
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3 rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouveau transport
        </Link>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center">
          <p className="text-2xl font-bold text-neutral-900">{jobs.length}</p>
          <p className="text-sm text-neutral-600">Total</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">
            {jobs.filter((j) => j.status === "PUBLISHED").length}
          </p>
          <p className="text-sm text-neutral-600">Publiées</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center">
          <p className="text-2xl font-bold text-accent-600">
            {jobs.filter((j) => j.status === "IN_PROGRESS").length}
          </p>
          <p className="text-sm text-neutral-600">En cours</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {jobs.filter((j) => j.status === "COMPLETED").length}
          </p>
          <p className="text-sm text-neutral-600">Terminés</p>
        </div>
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            Aucun transport
          </h3>
          <p className="text-neutral-600 mb-4">
            Commencez par créer votre premier transport
          </p>
          <Link
            href="/jobs/new"
            className="bg-brand-700 hover:bg-brand-800 text-white font-medium px-6 py-2 rounded-lg transition-colors inline-block"
          >
            Créer un transport
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {paginateArray(jobs, clientPage, CLIENT_PAGE_SIZE).map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={clientPage}
        totalItems={jobs.length}
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
