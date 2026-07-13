"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import StatusBadge from "@/components/ui/StatusBadge";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
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
  HelpCircle,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

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
  dateLocale,
}: {
  stats: ClientStats;
  recentJobs: RecentJob[];
  dateLocale: string;
}) {
  const { t } = useAppI18n();
  return (
    <>
      {/* Onboarding Wizard — shown only on first visits */}
      <OnboardingWizard />

      {/* CTA Hero */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 rounded-2xl p-8 text-white mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">
            {t.dashboard.clientCTA}
          </h2>
          <p className="text-blue-200 mb-6 max-w-lg">
            {t.dashboard.clientCTADesc}
          </p>
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-2 bg-accent-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-accent-600 transition-all hover:scale-105 shadow-lg shadow-brand-900/20"
          >
            <PlusCircle className="w-5 h-5" />
            {t.dashboard.publishAd}
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Truck}
          label={t.dashboard.activeAds}
          value={stats.active_jobs}
          accent="bg-brand-600/10 text-brand-600"
        />
        <StatCard
          icon={Package}
          label={t.dashboard.offersReceived}
          value={stats.total_offers_received}
          accent="bg-purple-50 text-purple-600"
          sub={t.dashboard.total}
        />
        <StatCard
          icon={CheckCircle2}
          label={t.dashboard.completedMissions}
          value={stats.completed_jobs}
          accent="bg-accent-50 text-accent-600"
        />
        <StatCard
          icon={Clock}
          label={t.dashboard.pendingOffersLabel}
          value={stats.pending_offers}
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">
            {t.dashboard.recentAds}
          </h3>
          <Link
            href="/jobs"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
          >
            {t.dashboard.viewAll} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
          </Link>
        </div>
        <div className="divide-y divide-neutral-50">
          {recentJobs.length === 0 ? (
            <div className="px-6 py-8 text-center text-neutral-400 text-sm">
              {t.dashboard.noAdsYet}{" "}
              <Link href="/jobs/new" className="text-brand-600 font-medium">
                {t.dashboard.publishAdLink}
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
                        dateLocale,
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
  dateLocale,
}: {
  stats: TransporterStats;
  recentJobs: RecentJob[];
  dateLocale: string;
}) {
  const { t } = useAppI18n();
  return (
    <>
      {/* Onboarding Wizard — shown only on first visits */}
      <OnboardingWizard />

      {/* Verification Banner */}
      {stats.verification_status !== "VERIFIED" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">
              {t.dashboard.verificationRequired}
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              {t.dashboard.verificationRequiredDesc}
            </p>
            <Link
              href="/verification"
              className="inline-flex items-center gap-1 text-sm font-semibold text-amber-800 mt-3 hover:text-amber-900"
            >
              {t.dashboard.completeVerification} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
            </Link>
          </div>
        </div>
      )}

      {/* Find Missions CTA */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-800 to-brand-900 rounded-2xl p-8 text-white mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">
            {t.dashboard.findMissionsTitle}
          </h2>
          <p className="text-blue-200 mb-6 max-w-lg">
            {stats.available_missions} {t.dashboard.missionsInZone}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/jobs/browse"
              className="inline-flex items-center gap-2 bg-accent-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-accent-600 transition-all hover:scale-105 shadow-lg shadow-brand-900/20"
            >
              <Search className="w-5 h-5" />
              {t.dashboard.browseMissions}
            </Link>
            <Link
              href="/jobs/return-trip"
              className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 shadow-lg"
              style={{
                background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
              }}
            >
              <RotateCcw className="w-5 h-5" />
              {t.dashboard.proposeReturnTrip}
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Search}
          label={t.dashboard.availableMissions}
          value={stats.available_missions}
          accent="bg-brand-600/10 text-brand-600"
        />
        <StatCard
          icon={Package}
          label={t.dashboard.activeOffersLabel}
          value={stats.active_offers}
          accent="bg-purple-50 text-purple-600"
        />
        <StatCard
          icon={CheckCircle2}
          label={t.dashboard.completedMissionsLabel}
          value={stats.completed_jobs}
          accent="bg-accent-50 text-accent-600"
        />
        <StatCard
          icon={DollarSign}
          label={t.dashboard.totalEarnings}
          value={`${stats.total_earnings} TND`}
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Performance + Recent Missions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Card */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-6">
            {t.dashboard.performance}
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Star className="w-4 h-4 text-amber-500" /> {t.dashboard.avgRating}
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
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> {t.dashboard.completionRateLabel}
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
                <ShieldCheck className="w-4 h-4 text-brand-600" /> {t.dashboard.verificationStatus}
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  stats.verification_status === "VERIFIED"
                    ? "bg-accent-50 text-accent-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {stats.verification_status === "VERIFIED"
                  ? t.dashboard.verified
                  : t.dashboard.pending}
              </span>
            </div>
          </div>
        </div>

        {/* Recent Missions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neutral-900">
              {t.dashboard.recentMissions}
            </h3>
            <Link
              href="/jobs"
              className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
            >
              {t.dashboard.viewAllMissions} <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
            </Link>
          </div>
          <div className="divide-y divide-neutral-50">
            {recentJobs.length === 0 ? (
              <div className="px-6 py-8 text-center text-neutral-400 text-sm">
                {t.dashboard.noRecentMissions}{" "}
                <Link
                  href="/jobs/browse"
                  className="text-brand-600 font-medium"
                >
                  {t.dashboard.browseMissionsLink}
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
                          dateLocale,
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
  const router = useRouter();
  const { t, locale } = useAppI18n();
  const dateLocale = locale === "ar" ? "ar-TN" : "fr-TN";

  useEffect(() => {
    if (user?.role === "admin") {
      router.replace("/admin/dashboard");
    }
  }, [user, router]);

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
          {t.dashboard.hello}{" "}
          {user?.first_name || user?.name?.split(" ")[0] || t.dashboard.defaultUser} 👋
        </h1>
        <p className="text-neutral-500 mt-1">
          {isClient
            ? t.dashboard.clientSubtitle
            : t.dashboard.transporterSubtitle}
        </p>
      </div>

      {/* Role-specific content */}
      {isClient && (
        <ClientDashboard stats={clientStats} recentJobs={recentJobs} dateLocale={dateLocale} />
      )}
      {isTransporter && (
        <TransporterDashboard
          stats={transporterStats}
          recentJobs={recentJobs}
          dateLocale={dateLocale}
        />
      )}

      {/* Fallback */}
      {!isClient && !isTransporter && (
        <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center">
          <BarChart3 className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-neutral-900">
            {t.dashboard.welcomeGeneric}
          </h2>
          <p className="text-neutral-500 mt-1">
            {t.dashboard.selectRole}
          </p>
        </div>
      )}
      {/* Help Center Quick Access (N5) */}
      <div className="mt-6 text-center">
        <Link
          href="/help"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-brand-600 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          {t.dashboard.needHelp}
        </Link>
      </div>
    </div>
  );
}
