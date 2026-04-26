"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  Truck,
  Package,
  Clock,
  DollarSign,
  PlusCircle,
  Search,
  Star,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/Skeleton";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface ClientStats {
  active_jobs: number;
  total_offers_received: number;
  completed_jobs: number;
  pending_offers: number;
}

interface TransporterStats {
  available_missions: number;
  active_offers: number;
  completed_jobs: number;
  total_earnings: number;
  verification_status: string;
  average_rating: number;
  completion_rate: number;
}

interface RecentJob {
  id: number;
  job_type: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_time: string;
  offer_count?: number;
}

/* -------------------------------------------------------------------------- */
/*  Stat Card Component                                                       */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent}`}
        >
          <Icon className="w-6 h-6" />
        </div>
        {sub && (
          <span className="text-xs font-medium text-neutral-500 bg-neutral-50 px-2 py-1 rounded-full">
            {sub}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-neutral-900">{value}</p>
      <p className="text-sm text-neutral-500 mt-1">{label}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  CLIENT Dashboard                                                          */
/* -------------------------------------------------------------------------- */

function ClientDashboard({
  stats,
  recentJobs,
}: {
  stats: ClientStats;
  recentJobs: RecentJob[];
}) {
  return (
    <>
      {/* CTA Hero */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 rounded-2xl p-8 text-white mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">
            Besoin de transporter quelque chose ?
          </h2>
          <p className="text-blue-200 mb-6 max-w-lg">
            Publiez votre annonce et recevez des offres de transporteurs
            vérifiés en quelques minutes.
          </p>
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-2 bg-accent-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-accent-600 transition-all hover:scale-105 shadow-lg shadow-brand-900/20"
          >
            <PlusCircle className="w-5 h-5" />
            Publier une annonce
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Truck}
          label="Annonces actives"
          value={stats.active_jobs}
          accent="bg-brand-600/10 text-brand-600"
        />
        <StatCard
          icon={Package}
          label="Offres reçues"
          value={stats.total_offers_received}
          accent="bg-purple-50 text-purple-600"
          sub="total"
        />
        <StatCard
          icon={CheckCircle2}
          label="Missions terminées"
          value={stats.completed_jobs}
          accent="bg-accent-50 text-accent-600"
        />
        <StatCard
          icon={Clock}
          label="Offres en attente"
          value={stats.pending_offers}
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">
            Mes annonces récentes
          </h3>
          <Link
            href="/jobs"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
          >
            Voir tout <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="divide-y divide-neutral-50">
          {recentJobs.length === 0 ? (
            <div className="px-6 py-8 text-center text-neutral-400 text-sm">
              Aucune annonce pour le moment.{" "}
              <Link href="/jobs/new" className="text-brand-600 font-medium">
                Publier une annonce →
              </Link>
            </div>
          ) : (
            recentJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${job.job_type === "TRANSPORT" ? "bg-brand-600/5 text-brand-600" : "bg-purple-50 text-purple-600"}`}
                  >
                    {job.job_type === "TRANSPORT" ? (
                      <Truck className="w-5 h-5" />
                    ) : (
                      <Package className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {job.pickup_address} → {job.dropoff_address}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {new Date(job.scheduled_time).toLocaleDateString(
                        "fr-TN",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                      {job.offer_count !== undefined &&
                        ` · ${job.offer_count} offre${job.offer_count > 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>
                <StatusBadge status={job.status} />
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  TRANSPORTER Dashboard                                                     */
/* -------------------------------------------------------------------------- */

function TransporterDashboard({
  stats,
  recentJobs,
}: {
  stats: TransporterStats;
  recentJobs: RecentJob[];
}) {
  return (
    <>
      {/* Verification Banner */}
      {stats.verification_status !== "VERIFIED" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">
              Vérification requise
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              Complétez votre vérification pour pouvoir soumettre des offres et
              accéder aux missions.
            </p>
            <Link
              href="/verification"
              className="inline-flex items-center gap-1 text-sm font-semibold text-amber-800 mt-3 hover:text-amber-900"
            >
              Compléter la vérification <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Find Missions CTA */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-800 to-brand-900 rounded-2xl p-8 text-white mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">
            Trouvez de nouvelles missions
          </h2>
          <p className="text-blue-200 mb-6 max-w-lg">
            {stats.available_missions} missions disponibles dans votre zone.
            Soumettez vos offres dès maintenant.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/jobs/browse"
              className="inline-flex items-center gap-2 bg-accent-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-accent-600 transition-all hover:scale-105 shadow-lg shadow-brand-900/20"
            >
              <Search className="w-5 h-5" />
              Parcourir les missions
            </Link>
            <Link
              href="/jobs/return-trip"
              className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 shadow-lg"
              style={{
                background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
              }}
            >
              <RotateCcw className="w-5 h-5" />
              Proposer un trajet retour
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Search}
          label="Missions disponibles"
          value={stats.available_missions}
          accent="bg-brand-600/10 text-brand-600"
        />
        <StatCard
          icon={Package}
          label="Offres actives"
          value={stats.active_offers}
          accent="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Missions terminées"
          value={stats.completed_jobs}
          accent="bg-accent-50 text-accent-600"
        />
        <StatCard
          icon={DollarSign}
          label="Gains totaux"
          value={`${stats.total_earnings} TND`}
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Performance + Recent Missions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Card */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-6">
            Performance
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Star className="w-4 h-4 text-amber-500" /> Note moyenne
                </div>
                <span className="text-lg font-bold text-neutral-900">
                  {stats.average_rating}/5
                </span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${(stats.average_rating / 5) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Taux de
                  complétion
                </div>
                <span className="text-lg font-bold text-neutral-900">
                  {stats.completion_rate}%
                </span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-2">
                <div
                  className="bg-accent-500 h-2 rounded-full transition-all"
                  style={{ width: `${stats.completion_rate}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <ShieldCheck className="w-4 h-4 text-brand-600" /> Statut
                vérification
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  stats.verification_status === "VERIFIED"
                    ? "bg-accent-50 text-accent-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {stats.verification_status === "VERIFIED"
                  ? "Vérifié ✓"
                  : "En attente"}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Missions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">
              Missions récentes
            </h3>
            <Link
              href="/jobs"
              className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
            >
              Tout voir <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-neutral-50">
            {recentJobs.length === 0 ? (
              <div className="px-6 py-8 text-center text-neutral-400 text-sm">
                Aucune mission récente.{" "}
                <Link
                  href="/jobs/browse"
                  className="text-brand-600 font-medium"
                >
                  Parcourir les missions →
                </Link>
              </div>
            ) : (
              recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${job.job_type === "TRANSPORT" ? "bg-brand-600/5 text-brand-600" : "bg-purple-50 text-purple-600"}`}
                    >
                      {job.job_type === "TRANSPORT" ? (
                        <Truck className="w-5 h-5" />
                      ) : (
                        <Package className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {job.pickup_address} → {job.dropoff_address}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {new Date(job.scheduled_time).toLocaleDateString(
                          "fr-TN",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={job.status} />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Dashboard Page                                                       */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
  const { user } = useAuth();
  const [clientStats, setClientStats] = useState<ClientStats>({
    active_jobs: 0,
    total_offers_received: 0,
    completed_jobs: 0,
    pending_offers: 0,
  });
  const [transporterStats, setTransporterStats] = useState<TransporterStats>({
    available_missions: 0,
    active_offers: 0,
    completed_jobs: 0,
    total_earnings: 0,
    verification_status: "UNVERIFIED",
    average_rating: 0,
    completion_rate: 0,
  });
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);

  const role = user?.role?.toUpperCase();
  const isClient = role === "CLIENT";
  const isTransporter = role === "TRANSPORTER";

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Use the new dedicated dashboard stats endpoint
        const data = await apiClient.get<any>("/api/auth/dashboard/");

        if (data.stats) {
          if (data.role === "CLIENT") {
            setClientStats(data.stats);
          } else if (data.role === "TRANSPORTER") {
            setTransporterStats(data.stats);
          }
        }

        if (data.recent_jobs) {
          setRecentJobs(data.recent_jobs);
        }
      } catch (err) {
        console.warn(
          "[Dashboard] API error, falling back to empty state:",
          err,
        );
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchDashboardData, 300);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">
          Bonjour,{" "}
          {user?.first_name || user?.name?.split(" ")[0] || "Utilisateur"} 👋
        </h1>
        <p className="text-neutral-500 mt-1">
          {isClient
            ? "Gérez vos transports et suivez vos annonces."
            : "Trouvez des missions et développez votre activité."}
        </p>
      </div>

      {/* Role-specific content */}
      {isClient && (
        <ClientDashboard stats={clientStats} recentJobs={recentJobs} />
      )}
      {isTransporter && (
        <TransporterDashboard
          stats={transporterStats}
          recentJobs={recentJobs}
        />
      )}

      {/* Fallback */}
      {!isClient && !isTransporter && (
        <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center">
          <BarChart3 className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-neutral-900">
            Bienvenue sur Transporti
          </h2>
          <p className="text-neutral-500 mt-1">
            Sélectionnez votre rôle pour voir votre tableau de bord.
          </p>
        </div>
      )}
    </div>
  );
}
