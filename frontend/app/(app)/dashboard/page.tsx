"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardSummary } from "@/lib/services/dashboard";
import StatusBadge from "@/components/ui/StatusBadge";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import { formatTND } from "@/lib/format";
import {
  Truck,
  Package,
  PlusCircle,
  Search,
  Star,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  BarChart3,
  RotateCcw,
  HelpCircle,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import ReturnsHubSection from "@/components/dashboard/ReturnsHubSection";
import {
  BandHeroCard,
  HeroFigure,
  StatTile,
  StatTileGrid,
} from "@/components/dashboard/BandHeroCard";
import { RETURN_TRIPS_FIRST } from "@/lib/flags";
import { urlJob } from "@/lib/routes/jobs";

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
  /** K4 — gains confirmés (escrow libéré), source unique B2 */
  total_earnings: number;
  /** K11 — net des missions livrées en attente de confirmation */
  earnings_pending?: number;
  /** K10 — solde disponible du portefeuille */
  wallet_available?: number;
  verification_status: string;
  average_rating: number | null;
  completion_rate: number | null;
  profile_completion?: number;
  /** K12 (pivot) — remplissage des trajets retour */
  return_trips_published?: number;
  return_trips_filled?: number;
  fill_rate?: number | null;
  km_transformed?: number;
}

interface RecentJob {
  id: number;
  job_type: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_time: string;
  offer_count?: number;
  /** Nature du job — construit son URL canonique sans le recharger. */
  is_return_trip?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  CLIENT Dashboard                                                          */
/* -------------------------------------------------------------------------- */

function ClientDashboard({
  stats,
  recentJobs,
  dateLocale,
  salutation,
}: {
  stats: ClientStats;
  recentJobs: RecentJob[];
  dateLocale: string;
  salutation: string;
}) {
  const { t } = useAppI18n();
  return (
    <>
      {/* Onboarding Wizard — shown only on first visits */}
      <OnboardingWizard />

      {/* Carte verre chevauchant le bandeau : promesse + indicateurs.
          L'action est BLEUE, pas orange : sur les écrans qui portent la nav
          basse, le seul orange autorisé est son bouton flottant (charte §1). */}
      <BandHeroCard>
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-on-blue-300">
            {salutation}
          </p>
          <h2 className="text-[21px] font-extrabold leading-[1.25] tracking-heading text-white">
            {RETURN_TRIPS_FIRST
              ? t.dashboard.clientCTAFirst
              : t.dashboard.clientCTA}
          </h2>
          <p className="max-w-lg text-[14.5px] leading-[1.5] text-on-blue-300">
            {RETURN_TRIPS_FIRST
              ? t.dashboard.clientCTAFirstDesc
              : t.dashboard.clientCTADesc}
          </p>
        </div>

        <StatTileGrid>
          <StatTile label={t.dashboard.activeAds} value={stats.active_jobs} />
          <StatTile
            label={t.dashboard.offersReceived}
            value={stats.total_offers_received}
          />
          <StatTile
            label={t.dashboard.completedMissions}
            value={stats.completed_jobs}
          />
          <StatTile
            label={t.dashboard.pendingOffersLabel}
            value={stats.pending_offers}
          />
        </StatTileGrid>

        {RETURN_TRIPS_FIRST ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/recherche" className="btn-base btn-secondary flex-1">
              <Search className="h-[18px] w-[18px]" strokeWidth={2.2} />
              {t.dashboard.findTripCTA}
            </Link>
            <Link
              href="/demandes/nouvelle"
              className="btn-base btn-ghost-on-blue flex-1"
            >
              <PlusCircle className="h-[18px] w-[18px]" strokeWidth={2.2} />
              {t.dashboard.publishAd}
            </Link>
          </div>
        ) : (
          <Link href="/demandes/nouvelle" className="btn-base btn-secondary">
            <PlusCircle className="h-[18px] w-[18px]" strokeWidth={2.2} />
            {t.dashboard.publishAd}
          </Link>
        )}
      </BandHeroCard>

      {/* Recent Jobs */}
      <div className="bg-surface rounded-card shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <h3 className="text-[17px] font-extrabold tracking-heading text-ink-900">
            {t.dashboard.recentAds}
          </h3>
          <Link
            href="/jobs"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
          >
            {t.dashboard.viewAll}{" "}
            <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
          </Link>
        </div>
        <div className="divide-y divide-line">
          {recentJobs.length === 0 ? (
            <div className="px-6 py-8 text-center text-neutral-400 text-sm">
              {t.dashboard.noAdsYet}{" "}
              <Link
                href="/demandes/nouvelle"
                className="text-brand-600 font-medium"
              >
                {t.dashboard.publishAdLink}
              </Link>
            </div>
          ) : (
            recentJobs.map((job) => (
              <Link
                key={job.id}
                href={urlJob(job.id, job.is_return_trip)}
                className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${job.job_type === "TRANSPORT" ? "bg-blue-50 text-blue-700" : "bg-blue-50 text-blue-700"}`}
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
  salutation,
}: {
  stats: TransporterStats;
  recentJobs: RecentJob[];
  dateLocale: string;
  salutation: string;
}) {
  const { t } = useAppI18n();
  return (
    <>
      {/* Onboarding Wizard — shown only on first visits */}
      <OnboardingWizard />

      {/* Verification Banner */}
      {stats.verification_status !== "VERIFIED" && (
        <div className="flex items-start gap-3 rounded-tile bg-warning-50 p-4 sm:p-5">
          <AlertCircle
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning-600"
            strokeWidth={2}
          />
          <div className="flex flex-col gap-1">
            <h3 className="text-[15px] font-bold text-warning-800">
              {t.dashboard.verificationRequired}
            </h3>
            <p className="text-[13px] leading-[1.5] text-warning-700">
              {t.dashboard.verificationRequiredDesc}
            </p>
            <Link
              href="/documents"
              className="mt-1 inline-flex items-center gap-1 text-[13px] font-bold text-warning-800 underline-offset-4 hover:underline"
            >
              {t.dashboard.completeVerification}{" "}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </div>
        </div>
      )}

      {/* Carte verre chevauchant le bandeau : gains en chiffre héro, puis les
          quatre indicateurs du transporteur. Le remplissage porte une jauge —
          verte quand elle est bonne, orange quand elle est à améliorer. */}
      <BandHeroCard>
        <p className="text-[13px] font-semibold text-on-blue-300">
          {salutation}
        </p>

        <HeroFigure
          label={t.dashboard.totalEarnings}
          value={formatTND(stats.total_earnings)}
        />

        <StatTileGrid>
          <StatTile
            label={t.dashboard.availableMissions}
            value={stats.available_missions}
          />
          <StatTile
            label={t.dashboard.activeOffersLabel}
            value={stats.active_offers}
          />
          <StatTile
            label={t.dashboard.completedMissionsLabel}
            value={stats.completed_jobs}
          />
          <StatTile
            label={t.dashboard.completionRateLabel}
            value={
              stats.completion_rate != null ? `${stats.completion_rate}%` : "—"
            }
            gauge={stats.completion_rate ?? 0}
            tone={(stats.completion_rate ?? 0) >= 80 ? "good" : "warn"}
          />
        </StatTileGrid>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/demandes" className="btn-base btn-secondary flex-1">
            <Search className="h-[18px] w-[18px]" strokeWidth={2.2} />
            {t.dashboard.browseMissions}
          </Link>
          <Link
            href="/retours/nouveau"
            className="btn-base btn-ghost-on-blue flex-1"
          >
            <RotateCcw className="h-[18px] w-[18px]" strokeWidth={2.2} />
            {t.dashboard.proposeReturnTrip}
          </Link>
        </div>
      </BandHeroCard>

      {/* T1.1 — le hub passe de « mes missions » à « mes retours ». Placé
          au-dessus des indicateurs de missions : le pivot fait du retour la
          racine du transporteur, pas une rubrique parmi d'autres (IA-2).
          Au-dessus de la bannière de vérification, en cohérence avec la
          décision 4 : publier un retour ne demande pas d'être déjà vérifié,
          et bloquer l'amorçage de l'inventaire tarirait la promesse client. */}
      <ReturnsHubSection
        kmValorises={stats.km_transformed}
        tauxRemplissage={stats.fill_rate}
      />

      {/* Performance + Recent Missions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Card */}
        <div className="bg-surface rounded-card shadow-card p-6">
          <h3 className="text-[17px] font-extrabold tracking-heading text-ink-900 mb-6">
            {t.dashboard.performance}
          </h3>
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Star className="w-4 h-4 text-warning-500" />{" "}
                  {t.dashboard.avgRating}
                </div>
                <span className="text-[17px] font-extrabold tracking-heading text-ink-900">
                  {stats.average_rating != null
                    ? `${stats.average_rating}/5`
                    : "—"}
                </span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-2">
                <div
                  className="bg-warning-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${((stats.average_rating ?? 0) / 5) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <TrendingUp className="w-4 h-4 text-green-500" />{" "}
                  {t.dashboard.completionRateLabel}
                </div>
                <span className="text-[17px] font-extrabold tracking-heading text-ink-900">
                  {stats.completion_rate != null
                    ? `${stats.completion_rate}%`
                    : "—"}
                </span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-2">
                <div
                  className="bg-accent-500 h-2 rounded-full transition-all"
                  style={{ width: `${stats.completion_rate ?? 0}%` }}
                />
              </div>
            </div>
            {/* K12 (pivot) — remplissage des trajets retour */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <RotateCcw className="w-4 h-4 text-blue-600" />{" "}
                  {t.dashboard.fillRateLabel}
                </div>
                <span className="text-[17px] font-extrabold tracking-heading text-ink-900">
                  {stats.fill_rate != null ? `${stats.fill_rate}%` : "—"}
                </span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${stats.fill_rate ?? 0}%` }}
                />
              </div>
              <p className="text-xs text-neutral-400 mt-1.5">
                {interpolate(t.dashboard.fillRateDetail, {
                  filled: stats.return_trips_filled ?? 0,
                  published: stats.return_trips_published ?? 0,
                })}
                {" · "}
                {interpolate(t.dashboard.kmTransformed, {
                  km: Math.round(stats.km_transformed ?? 0),
                })}
              </p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-line">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <ShieldCheck className="w-4 h-4 text-brand-600" />{" "}
                {t.dashboard.verificationStatus}
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  stats.verification_status === "VERIFIED"
                    ? "bg-green-50 text-green-700"
                    : "bg-warning-50 text-warning-700"
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
        <div className="lg:col-span-2 bg-surface rounded-card shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-line flex items-center justify-between">
            <h3 className="text-[17px] font-extrabold tracking-heading text-ink-900">
              {t.dashboard.recentMissions}
            </h3>
            <Link
              href="/jobs"
              className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
            >
              {t.dashboard.viewAllMissions}{" "}
              <ArrowRight className="w-4 h-4 rtl:-scale-x-100" />
            </Link>
          </div>
          <div className="divide-y divide-line">
            {recentJobs.length === 0 ? (
              <div className="px-6 py-8 text-center text-neutral-400 text-sm">
                {t.dashboard.noRecentMissions}{" "}
                <Link href="/demandes" className="text-brand-600 font-medium">
                  {t.dashboard.browseMissionsLink}
                </Link>
              </div>
            ) : (
              recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={urlJob(job.id, job.is_return_trip)}
                  className="flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${job.job_type === "TRANSPORT" ? "bg-blue-50 text-blue-700" : "bg-blue-50 text-blue-700"}`}
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
        const data = await getDashboardSummary();

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
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-6 sm:px-6 lg:px-8">
        <DashboardSkeleton />
      </div>
    );
  }

  // Salutation nominative, portée par la carte verre du bandeau : le titre
  // d'écran est déjà rendu par l'en-tête, on ne le double pas.
  const prenom =
    user?.first_name || user?.name?.split(" ")[0] || t.dashboard.defaultUser;
  const salutation = `${t.dashboard.hello} ${prenom} 👋`;

  return (
    <div className="stack-app mx-auto max-w-7xl px-5 pb-10 pt-12 sm:px-6 lg:px-8">
      {/* Role-specific content */}
      {isClient && (
        <ClientDashboard
          stats={clientStats}
          recentJobs={recentJobs}
          dateLocale={dateLocale}
          salutation={salutation}
        />
      )}
      {isTransporter && (
        <TransporterDashboard
          stats={transporterStats}
          recentJobs={recentJobs}
          dateLocale={dateLocale}
          salutation={salutation}
        />
      )}

      {/* Fallback */}
      {!isClient && !isTransporter && (
        <div className="bg-surface rounded-card shadow-card p-12 text-center">
          <BarChart3 className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h2 className="text-[17px] font-extrabold tracking-heading text-ink-900">
            {t.dashboard.welcomeGeneric}
          </h2>
          <p className="text-neutral-500 mt-1">{t.dashboard.selectRole}</p>
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
