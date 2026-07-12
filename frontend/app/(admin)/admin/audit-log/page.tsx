"use client";

import { useState, useEffect, useCallback } from "react";
import Pagination from "@/components/admin/Pagination";
import {
  ScrollText,
  Filter,
  Calendar,
  User,
  ShieldCheck,
  AlertTriangle,
  Star,
  CreditCard,
  Truck,
  Ban,
  CheckCircle,
  KeyRound,
  Eye,
  EyeOff,
  Clock,
} from "lucide-react";
import { apiClient, ApiError, getErrorMessage } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useAppI18n";

interface AuditEntry {
  id: number;
  adminName: string;
  adminEmail: string;
  action: string;
  actionLabel: string;
  targetType: string;
  targetId: number;
  targetLabel: string;
  details: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  totalCount: number;
  todayCount: number;
  availableActions: { value: string; label: string }[];
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  USER_SUSPENDED: <Ban className="w-4 h-4 text-red-500" />,
  USER_ACTIVATED: <CheckCircle className="w-4 h-4 text-green-500" />,
  PASSWORD_RESET: <KeyRound className="w-4 h-4 text-amber-500" />,
  DOCUMENT_APPROVED: <ShieldCheck className="w-4 h-4 text-green-500" />,
  DOCUMENT_REJECTED: <ShieldCheck className="w-4 h-4 text-red-500" />,
  PROFILE_VERIFIED: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
  PROFILE_REJECTED: <ShieldCheck className="w-4 h-4 text-red-500" />,
  DISPUTE_INVESTIGATED: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  DISPUTE_RESOLVED: <AlertTriangle className="w-4 h-4 text-green-500" />,
  DISPUTE_REJECTED: <AlertTriangle className="w-4 h-4 text-red-500" />,
  REVIEW_HIDDEN: <EyeOff className="w-4 h-4 text-neutral-500" />,
  REVIEW_SHOWN: <Eye className="w-4 h-4 text-blue-500" />,
  USER_WARNED: <AlertTriangle className="w-4 h-4 text-orange-500" />,
  ESCROW_RELEASED: <CreditCard className="w-4 h-4 text-green-500" />,
  COMMISSION_SETTLED: <CreditCard className="w-4 h-4 text-blue-500" />,
  JOB_CANCELLED: <Truck className="w-4 h-4 text-red-500" />,
  JOB_STATUS_FORCED: <Truck className="w-4 h-4 text-amber-500" />,
};

const ACTION_COLORS: Record<string, string> = {
  USER_SUSPENDED: "bg-red-50 border-red-200",
  USER_ACTIVATED: "bg-green-50 border-green-200",
  PASSWORD_RESET: "bg-amber-50 border-amber-200",
  DOCUMENT_APPROVED: "bg-green-50 border-green-200",
  DOCUMENT_REJECTED: "bg-red-50 border-red-200",
  DISPUTE_RESOLVED: "bg-green-50 border-green-200",
  DISPUTE_REJECTED: "bg-red-50 border-red-200",
};

const TARGET_ICONS: Record<string, React.ReactNode> = {
  user: <User className="w-3.5 h-3.5" />,
  dispute: <AlertTriangle className="w-3.5 h-3.5" />,
  document: <ShieldCheck className="w-3.5 h-3.5" />,
  review: <Star className="w-3.5 h-3.5" />,
  escrow: <CreditCard className="w-3.5 h-3.5" />,
  job: <Truck className="w-3.5 h-3.5" />,
};

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `il y a ${diffD}j`;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAuditLogPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [daysFilter, setDaysFilter] = useState("30");
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/admin/audit-log/?days=${daysFilter}&limit=200`;
      if (actionFilter) url += `&action=${actionFilter}`;
      const result = await apiClient.get<AuditResponse>(url);
      setData(result);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, daysFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const entries = data?.entries || [];
  const totalPages = Math.ceil(entries.length / pageSize);
  const paginatedEntries = entries.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <ScrollText className="w-7 h-7 text-brand-600" />
            {t.audit.title}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            {t.audit.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* CSV Export */}
          <button
            onClick={() => {
              if (!entries.length) return;
              const headers = ["Date", "Admin", "Email", "Action", "Cible", "ID Cible", "Détails", "IP"];
              const rows = entries.map(e => [
                formatDateTime(e.createdAt),
                e.adminName,
                e.adminEmail,
                e.actionLabel,
                e.targetLabel,
                String(e.targetId),
                JSON.stringify(e.details || {}),
                e.ipAddress || "",
              ]);
              const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
              const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={!entries.length}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1e293b] border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export CSV
          </button>
          {data && (
            <>
              <div className="text-right">
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {data.totalCount}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t.audit.totalActions}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                  {data.todayCount}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t.audit.today}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <Filter className="w-4 h-4" />
            <span className="font-medium">{t.audit.filters}</span>
          </div>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-[#0f172a] border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm text-neutral-900 dark:text-neutral-200 focus:ring-2 focus:ring-brand-500"
          >
            <option value="">{t.audit.allActions}</option>
            {(data?.availableActions || []).map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>

          {/* Days Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-400" />
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-[#0f172a] border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm text-neutral-900 dark:text-neutral-200 focus:ring-2 focus:ring-brand-500"
            >
              <option value="1">{t.audit.todayFilter}</option>
              <option value="7">{t.audit.last7}</option>
              <option value="30">{t.audit.last30}</option>
              <option value="90">{t.audit.last90}</option>
              <option value="365">{t.audit.lastYear}</option>
            </select>
          </div>

          <span className="text-sm text-neutral-400 ml-auto">
            {entries.length} entrée{entries.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400">
            Chargement du journal...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Entries */}
      {!loading && !error && (
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
              <ScrollText className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400 font-medium">
                Aucune action enregistrée
              </p>
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                Les actions admin apparaîtront ici automatiquement
              </p>
            </div>
          ) : (
            paginatedEntries.map((entry) => (
              <div
                key={entry.id}
                className={`bg-white dark:bg-[#1e293b] rounded-xl border p-4 hover:shadow-sm transition-shadow ${
                  ACTION_COLORS[entry.action] ||
                  "border-neutral-200 dark:border-neutral-700"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="p-2 bg-neutral-100 rounded-lg flex-shrink-0 mt-0.5">
                    {ACTION_ICONS[entry.action] || (
                      <ScrollText className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-neutral-900 dark:text-white text-sm">
                        {entry.actionLabel}
                      </span>
                      <span className="px-2 py-0.5 bg-neutral-100 rounded text-xs text-neutral-500 font-mono">
                        {entry.action}
                      </span>
                    </div>

                    {/* Target */}
                    <div className="flex items-center gap-2 mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                      {TARGET_ICONS[entry.targetType] || null}
                      <span>
                        {entry.targetType} #{entry.targetId}
                      </span>
                      {entry.targetLabel && (
                        <>
                          <span className="text-neutral-300">—</span>
                          <span className="font-medium">
                            {entry.targetLabel}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Details */}
                    {entry.details && Object.keys(entry.details).length > 0 && (
                      <div className="mt-2 px-3 py-2 bg-neutral-50 rounded-lg text-xs text-neutral-500 font-mono">
                        {Object.entries(entry.details).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-neutral-400">{k}:</span>{" "}
                            {String(v)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Meta (right side) */}
                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimeAgo(entry.createdAt)}
                    </div>
                    <p
                      className="text-xs text-neutral-400 mt-1"
                      title={formatDateTime(entry.createdAt)}
                    >
                      {formatDateTime(entry.createdAt)}
                    </p>
                    <p className="text-xs text-neutral-400 mt-2 font-medium">
                      par {entry.adminName}
                    </p>
                    {entry.ipAddress && (
                      <p className="text-[10px] text-neutral-300 font-mono mt-0.5">
                        {entry.ipAddress}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && entries.length > pageSize && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={entries.length}
          pageSize={pageSize}
        />
      )}
    </div>
  );
}
