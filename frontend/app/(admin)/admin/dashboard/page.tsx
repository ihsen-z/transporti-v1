"use client";

import { useEffect, useRef, useState } from "react";
import {
  Users,
  Truck,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import StatCard from "@/components/admin/StatCard";
import DataTable from "@/components/admin/DataTable";
import dynamic from "next/dynamic";

const RevenueChart = dynamic(() => import("@/components/admin/RevenueChart"), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] flex items-center justify-center text-neutral-400">
      Chargement du graphique...
    </div>
  ),
});
import { JobStatusBadge } from "@/components/admin/StatusBadge";
import {
  formatCurrency,
  formatTimeAgoShort,
  getActivityIcon,
  getAlertSeverityColor,
  type AdminJob,
} from "@/lib/admin";
import {
  useAdminStats,
  useAdminJobs,
  useActivityLogs,
  useSystemAlerts,
} from "@/hooks/useAdminData";
import LoadingState from "@/components/ui/LoadingState";
import {
  DashboardConfigProvider,
  DashboardConfigPanel,
  DashboardSettingsButton,
  useDashboardConfig,
} from "@/components/admin/DashboardConfig";
import { useI18n } from "@/lib/i18n";

/* -------------------------------------------------------------------------- */
/*  Inner Dashboard (needs context)                                           */
/* -------------------------------------------------------------------------- */

function DashboardContent() {
  const {
    data: stats,
    loading: statsLoading,
    source: _source,
    refetch: refetchStats,
  } = useAdminStats();
  const {
    data: allJobs,
    loading: jobsLoading,
    refetch: refetchJobs,
  } = useAdminJobs();
  const { data: activityLogs, refetch: refetchActivity } = useActivityLogs();
  const { data: systemAlerts, refetch: refetchAlerts } = useSystemAlerts();

  const { prefs, isWidgetVisible } = useDashboardConfig();
  const { t, locale } = useI18n();
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [chartDays, setChartDays] = useState(30);

  const loading = statsLoading || jobsLoading;

  // Auto-refresh ALL dashboard widgets
  useEffect(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    if (prefs.autoRefresh && prefs.refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        refetchStats();
        refetchJobs();
        refetchActivity();
        refetchAlerts();
      }, prefs.refreshInterval * 1000);
    }
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [prefs.autoRefresh, prefs.refreshInterval, refetchStats, refetchJobs, refetchActivity, refetchAlerts]);

  if (loading) {
    return <LoadingState variant="page" />;
  }

  const recentJobs = allJobs.slice(0, 5);

  const jobColumns = [
    {
      key: "id",
      header: "ID",
      render: (job: AdminJob) => (
        <span className="font-mono text-neutral-600">#{job.id}</span>
      ),
    },
    {
      key: "clientName",
      header: t.jobs.client,
    },
    {
      key: "transporterName",
      header: t.jobs.transporter,
      render: (job: AdminJob) => (
        <span className={job.transporterName ? "" : "text-neutral-400"}>
          {job.transporterName || t.jobs.unassigned}
        </span>
      ),
    },
    {
      key: "status",
      header: t.jobs.status,
      render: (job: AdminJob) => <JobStatusBadge status={job.status} />,
    },
    {
      key: "price",
      header: t.jobs.amount,
      render: (job: AdminJob) => (
        <span className="font-medium">{formatCurrency(job.price ?? 0)}</span>
      ),
    },
  ];

  // KPI cards with their widget IDs
  const primaryKPIs = [
    {
      id: "kpi-users",
      props: {
        title: t.dashboard.kpiUsers,
        value: stats.totalUsers.toLocaleString(),
        subtitle: `${stats.activeUsers} ${t.dashboard.active}`,
        icon: Users,
        color: "primary" as const,
      },
    },
    {
      id: "kpi-jobs",
      props: {
        title: t.dashboard.kpiActiveJobs,
        value: stats.activeJobs,
        subtitle: `${stats.pendingJobs} ${t.dashboard.pending}`,
        icon: Truck,
        color: "accent" as const,
      },
    },
    {
      id: "kpi-escrow",
      props: {
        title: t.dashboard.kpiEscrow,
        value: formatCurrency(stats.totalEscrow),
        subtitle: `${formatCurrency(stats.pendingEscrow)} ${t.dashboard.pending}`,
        icon: CreditCard,
        color: "warning" as const,
      },
    },
    {
      id: "kpi-revenue",
      props: {
        title: t.dashboard.kpiRevenue,
        value: formatCurrency(stats.platformRevenue),
        subtitle: t.dashboard.commission,
        icon: DollarSign,
        color: "accent" as const,
      },
    },
  ];

  const secondaryKPIs = [
    {
      id: "kpi-completed",
      props: {
        title: t.dashboard.kpiCompleted,
        value: stats.completedJobs.toLocaleString(),
        icon: CheckCircle,
        color: "accent" as const,
      },
    },
    {
      id: "kpi-verified",
      props: {
        title: t.dashboard.kpiVerified,
        value: `${stats.verifiedTransporters}/${stats.totalTransporters}`,
        icon: Truck,
        color: "primary" as const,
      },
    },
    {
      id: "kpi-disputes",
      props: {
        title: t.dashboard.kpiDisputes,
        value: stats.activeDisputes,
        icon: AlertTriangle,
        color: "danger" as const,
      },
    },
    {
      id: "kpi-trust",
      props: {
        title: t.dashboard.kpiTrust,
        value: `${stats.avgTrustScore}/100`,
        icon: TrendingUp,
        color: "neutral" as const,
      },
    },
  ];

  const visiblePrimary = primaryKPIs.filter((k) => isWidgetVisible(k.id));
  const visibleSecondary = secondaryKPIs.filter((k) => isWidgetVisible(k.id));

  const compactClass = prefs.compactMode
    ? "lg:grid-cols-4 md:grid-cols-3"
    : "lg:grid-cols-4 md:grid-cols-2";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t.dashboard.title}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            {t.dashboard.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DashboardSettingsButton />
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            {prefs.autoRefresh && (
              <span className="inline-flex items-center gap-1 mr-2 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Auto
              </span>
            )}
            {t.dashboard.lastUpdate}:{" "}
            {new Date().toLocaleTimeString(locale === "ar" ? "ar-TN" : "fr-FR")}
          </div>
        </div>
      </div>

      {/* Primary KPI Stats Grid */}
      {visiblePrimary.length > 0 && (
        <div className={`grid grid-cols-1 ${compactClass} gap-4`}>
          {visiblePrimary.map((kpi) => (
            <StatCard key={kpi.id} {...kpi.props} compact={prefs.compactMode} />
          ))}
        </div>
      )}

      {/* Secondary Stats */}
      {visibleSecondary.length > 0 && (
        <div className={`grid grid-cols-1 ${compactClass} gap-4`}>
          {visibleSecondary.map((kpi) => (
            <StatCard key={kpi.id} {...kpi.props} compact={prefs.compactMode} />
          ))}
        </div>
      )}

      {/* Revenue Chart — D4 + D2 Date Range */}
      {isWidgetVisible("section-jobs") && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 transition-colors duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              {locale === "ar" ? "تحليل الإيرادات" : "Analyse des revenus"}
            </h2>
            <div className="flex gap-1.5 bg-neutral-100 dark:bg-[#0f172a] rounded-lg p-1">
              {[
                { days: 7, label: "7j" },
                { days: 30, label: "30j" },
                { days: 90, label: "90j" },
                { days: 365, label: "1an" },
              ].map((range) => (
                <button
                  key={range.days}
                  onClick={() => setChartDays(range.days)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    chartDays === range.days
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 mb-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              {locale === "ar" ? "الإيرادات" : "Revenu brut"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              {locale === "ar" ? "العمولة" : "Commission (10%)"}
            </span>
          </div>
          <RevenueChart days={chartDays} jobs={allJobs} />
        </div>
      )}


      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Jobs Table */}
        {isWidgetVisible("section-jobs") && (
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                {t.dashboard.recentJobs}
              </h2>
              <Link
                href="/admin/jobs"
                className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-800 font-medium"
              >
                {t.dashboard.viewAll}
              </Link>
            </div>
            <DataTable columns={jobColumns} data={recentJobs} />
          </div>
        )}

        {/* Sidebar - Activity & Alerts */}
        <div className="space-y-6">
          {/* System Alerts */}
          {isWidgetVisible("section-alerts") && (
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
                {t.dashboard.systemAlerts}
              </h2>
              <div className="space-y-3">
                {systemAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${getAlertSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{alert.title}</p>
                        <p className="text-xs mt-1 opacity-80">
                          {alert.description}
                        </p>
                      </div>
                      {!alert.isRead && (
                        <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1"></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Feed */}
          {isWidgetVisible("section-activity") && (
            <div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
                {t.dashboard.recentActivity}
              </h2>
              <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-100 dark:divide-neutral-700">
                {activityLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-4 flex items-start gap-3">
                    <span className="text-lg">{getActivityIcon(log.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-700 dark:text-neutral-300">
                        {log.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-neutral-500">
                          {log.userName}
                        </span>
                        <span className="text-xs text-neutral-400">•</span>
                        <span className="text-xs text-neutral-400">
                          {formatTimeAgoShort(log.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Config Panel */}
      <DashboardConfigPanel />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page Export (wraps with provider)                                          */
/* -------------------------------------------------------------------------- */

export default function AdminDashboardPage() {
  return (
    <DashboardConfigProvider>
      <DashboardContent />
    </DashboardConfigProvider>
  );
}
