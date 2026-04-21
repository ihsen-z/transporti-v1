"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Ban,
  RefreshCw,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import DataTable from "@/components/admin/DataTable";
import { JobStatusBadge } from "@/components/admin/StatusBadge";
import { useAdminJobs } from "@/hooks/useAdminData";
import { formatCurrency, formatDate, type AdminJob } from "@/lib/admin";
import { cancelJob, forceJobStatus } from "@/lib/services/admin";
import { useI18n } from "@/lib/i18n";

type StatusFilter =
  | "ALL"
  | "DRAFT"
  | "PUBLISHED"
  | "MATCHED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

type SortKey = "id" | "price" | "created_at" | "status";
type SortDir = "asc" | "desc";

// Status tabs and options are now generated inside the component using translations

export default function AdminJobsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const { data: allJobs, loading, error, refetch } = useAdminJobs();
  const { t } = useI18n();

  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: "ALL", label: t.jobs.all },
    { value: "PUBLISHED", label: t.jobs.published },
    { value: "MATCHED", label: t.jobs.matched },
    { value: "IN_PROGRESS", label: t.jobs.inProgress },
    { value: "COMPLETED", label: t.jobs.completed },
    { value: "CANCELLED", label: t.jobs.cancelled },
  ];

  const STATUS_OPTIONS = [
    { value: "DRAFT", label: t.jobs.draft },
    { value: "PUBLISHED", label: t.jobs.published },
    { value: "MATCHED", label: t.jobs.matched },
    { value: "IN_PROGRESS", label: t.jobs.inProgress },
    { value: "COMPLETED", label: t.jobs.completed },
    { value: "CANCELLED", label: t.jobs.cancelled },
  ];

  // Action state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showForceModal, setShowForceModal] = useState(false);
  const [targetJob, setTargetJob] = useState<AdminJob | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  /* ---- Sort handler ---- */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  /* ---- Sort icon component ---- */
  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-neutral-300 ml-1" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-brand-600 ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-brand-600 ml-1" />
    );
  };

  /* ---- Filtered + Sorted jobs ---- */
  const filteredJobs = useMemo(() => {
    let jobs =
      filter === "ALL"
        ? allJobs
        : allJobs.filter((job) => job.status === filter);

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      jobs = jobs.filter(
        (job) =>
          (job.title || "").toLowerCase().includes(q) ||
          (job.clientName || "").toLowerCase().includes(q) ||
          (job.transporterName || "").toLowerCase().includes(q) ||
          (job.clientEmail || "").toLowerCase().includes(q) ||
          (job.cityFrom || "").toLowerCase().includes(q) ||
          (job.cityTo || "").toLowerCase().includes(q) ||
          String(job.id).includes(q),
      );
    }

    // Sort
    jobs = [...jobs].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "id":
          cmp = a.id - b.id;
          break;
        case "price":
          cmp = (a.price || 0) - (b.price || 0);
          break;
        case "created_at":
          cmp =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "status":
          cmp = (a.status || "").localeCompare(b.status || "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return jobs;
  }, [allJobs, filter, searchQuery, sortKey, sortDir]);

  /* ---- Navigate to job detail ---- */
  const handleRowClick = (job: AdminJob) => {
    router.push(`/admin/jobs/${job.id}`);
  };

  /* ---- Show feedback ---- */
  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  /* ---- Action handlers ---- */
  const openCancelModal = (job: AdminJob, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetJob(job);
    setActionReason("");
    setShowCancelModal(true);
  };

  const openForceModal = (job: AdminJob, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetJob(job);
    setActionReason("");
    setNewStatus("");
    setShowForceModal(true);
  };

  const confirmCancel = async () => {
    if (!targetJob || !actionReason.trim()) return;
    setActionLoading(true);
    try {
      await cancelJob(targetJob.id, actionReason);
      showFeedback("success", `✅ Job #${targetJob.id} annulé avec succès.`);
      setShowCancelModal(false);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      showFeedback("error", `Échec: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const confirmForceStatus = async () => {
    if (!targetJob || !actionReason.trim() || !newStatus) return;
    setActionLoading(true);
    try {
      await forceJobStatus(targetJob.id, newStatus, actionReason);
      showFeedback(
        "success",
        `✅ Job #${targetJob.id} — statut changé en ${newStatus}.`,
      );
      setShowForceModal(false);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      showFeedback("error", `Échec: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  /* ---- Column definitions ---- */
  const columns = [
    {
      key: "id",
      header: "ID",
      width: "w-16",
      render: (job: AdminJob) => (
        <span className="font-mono text-neutral-500 text-xs">#{job.id}</span>
      ),
    },
    {
      key: "title",
      header: t.jobs.titleCol,
      render: (job: AdminJob) => (
        <div>
          <p className="font-medium text-neutral-900 truncate max-w-[220px]">
            {job.title || `Job #${job.id}`}
          </p>
          <p className="text-xs text-neutral-500">
            {job.cityFrom || job.pickup?.split(",")[0] || "-"} →{" "}
            {job.cityTo || job.delivery?.split(",")[0] || "-"}
          </p>
        </div>
      ),
    },
    {
      key: "clientName",
      header: t.jobs.client,
      render: (job: AdminJob) => (
        <div>
          <p className="font-medium text-neutral-700">
            {job.clientName || "-"}
          </p>
          <p className="text-xs text-neutral-400">{job.clientEmail || ""}</p>
        </div>
      ),
    },
    {
      key: "transporterName",
      header: t.jobs.transporter,
      render: (job: AdminJob) =>
        job.transporterName ? (
          <div>
            <p className="font-medium text-neutral-700">
              {job.transporterName}
            </p>
            <p className="text-xs text-neutral-400">
              {job.transporterEmail || ""}
            </p>
          </div>
        ) : (
          <span className="text-neutral-400 italic text-sm">
            {t.jobs.unassigned}
          </span>
        ),
    },
    {
      key: "status",
      header: (
        <button
          onClick={() => handleSort("status")}
          className="flex items-center cursor-pointer hover:text-brand-600 transition-colors"
        >
          {t.jobs.status} <SortIcon colKey="status" />
        </button>
      ),
      render: (job: AdminJob) => <JobStatusBadge status={job.status} />,
    },
    {
      key: "offersCount",
      header: t.jobs.offers,
      width: "w-20",
      render: (job: AdminJob) => {
        const count = (job as any).offersCount ?? 0;
        return (
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
            <span
              className={`font-medium text-sm ${count > 0 ? "text-brand-600" : "text-neutral-400"}`}
            >
              {count}
            </span>
          </div>
        );
      },
    },
    {
      key: "price",
      header: (
        <button
          onClick={() => handleSort("price")}
          className="flex items-center cursor-pointer hover:text-brand-600 transition-colors"
        >
          {t.jobs.amount} <SortIcon colKey="price" />
        </button>
      ),
      render: (job: AdminJob) => (
        <span className="font-semibold text-neutral-900">
          {formatCurrency(job.price || 0)}
        </span>
      ),
    },
    {
      key: "created_at",
      header: (
        <button
          onClick={() => handleSort("created_at")}
          className="flex items-center cursor-pointer hover:text-brand-600 transition-colors"
        >
          {t.jobs.date} <SortIcon colKey="created_at" />
        </button>
      ),
      render: (job: AdminJob) => (
        <span className="text-neutral-600 text-sm">
          {formatDate(job.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: t.jobs.actions,
      width: "w-32",
      render: (job: AdminJob) => (
        <div className="flex items-center gap-1">
          {/* Cancel Button — only for non-cancelled, non-completed jobs */}
          {job.status !== "CANCELLED" && job.status !== "COMPLETED" && (
            <button
              onClick={(e) => openCancelModal(job, e)}
              title="Annuler ce job"
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
          {/* Force Status Button */}
          <button
            onClick={(e) => openForceModal(job, e)}
            title="Changer le statut"
            className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {/* Detail Link */}
          <Link
            href={`/admin/jobs/${job.id}`}
            className="p-1.5 text-neutral-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors inline-flex"
            onClick={(e) => e.stopPropagation()}
          >
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all animate-in slide-in-from-right ${
            feedback.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {t.jobs.title}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          {t.jobs.subtitle}
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400">
            {t.jobs.loading}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          ⚠️ Erreur de chargement: {error?.message}
        </div>
      )}

      {!loading && (
        <>
          {/* Controls: Status Tabs + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {statusTabs.map((tab) => {
                const isActive = filter === tab.value;
                const count =
                  tab.value === "ALL"
                    ? allJobs.length
                    : allJobs.filter((j) => j.status === tab.value).length;

                return (
                  <button
                    key={tab.value}
                    onClick={() => setFilter(tab.value)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${
                        isActive
                          ? "bg-brand-600 text-white shadow-sm"
                          : "bg-white dark:bg-[#1e293b] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-600"
                      }
                    `}
                  >
                    {tab.label}
                    <span
                      className={`ml-2 px-1.5 py-0.5 rounded text-xs ${isActive ? "bg-white/20" : "bg-neutral-100 dark:bg-neutral-700"}`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.jobs.searchPlaceholder}
                className="pl-9 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm text-neutral-900 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 w-full sm:w-80"
              />
            </div>
          </div>

          {/* Stats Bar */}
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {t.jobs.totalDisplayed}:
                </span>
                <span className="ml-2 font-semibold text-neutral-900 dark:text-white">
                  {filteredJobs.length} jobs
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {t.jobs.totalValue}:
                </span>
                <span className="ml-2 font-semibold text-neutral-900 dark:text-white">
                  {formatCurrency(
                    filteredJobs.reduce((sum, j) => sum + (j.price || 0), 0),
                  )}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {t.jobs.totalOffers}:
                </span>
                <span className="ml-2 font-semibold text-brand-600 dark:text-brand-400">
                  {filteredJobs.reduce(
                    (sum, j) => sum + ((j as any).offersCount || 0),
                    0,
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Jobs Table */}
          <DataTable
            columns={columns}
            data={filteredJobs}
            onRowClick={handleRowClick}
            emptyMessage="Aucun job trouvé pour ce filtre"
          />
        </>
      )}

      {/* ---------- Cancel Modal ---------- */}
      {showCancelModal && targetJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white">
                    {t.jobs.cancelJob} #{targetJob.id}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {targetJob.title || `Job #${targetJob.id}`} — Statut actuel:{" "}
                    {targetJob.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-1 hover:bg-neutral-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{t.jobs.cancelWarning}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {t.jobs.cancelReason} *
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={t.jobs.cancelReasonPlaceholder}
                  className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-[#0f172a]">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={confirmCancel}
                disabled={!actionReason.trim() || actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t.jobs.confirmCancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Force Status Modal ---------- */}
      {showForceModal && targetJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white">
                    {t.jobs.changeStatus} — Job #{targetJob.id}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {t.jobs.currentStatus}:{" "}
                    <span className="font-medium">{targetJob.status}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowForceModal(false)}
                className="p-1 hover:bg-neutral-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {t.jobs.newStatus} *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                >
                  <option value="">{t.jobs.selectStatus}</option>
                  {STATUS_OPTIONS.filter(
                    (s) => s.value !== targetJob.status,
                  ).map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {t.jobs.justification} *
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={t.jobs.justificationPlaceholder}
                  className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-[#0f172a]">
              <button
                onClick={() => setShowForceModal(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={confirmForceStatus}
                disabled={!actionReason.trim() || !newStatus || actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t.jobs.applyChange}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
