"use client";

import { useState } from "react";
import Link from "next/link";
import DataTable from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import { formatTimeAgoShort, formatCurrency } from "@/lib/format";
import { useAdminDisputes } from "@/hooks/useAdminData";
import {
  investigateDispute,
  resolveDispute,
  rejectDispute,
  type BackendDispute,
} from "@/lib/services/admin";
import {
  AlertTriangle,
  Eye,
  Search as SearchIcon,
  MessageSquare,
  CheckCircle,
  XCircle,
  User,
  DollarSign,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/useAppI18n";

/* -------------------------------------------------------------------------- */
/*  Status Config                                                              */
/* -------------------------------------------------------------------------- */

type DisputeStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "REJECTED";

const statusColors: Record<DisputeStatus, string> = {
  OPEN: "bg-red-100 text-red-700",
  INVESTIGATING: "bg-brand-600/10 text-brand-600",
  RESOLVED: "bg-green-100 text-green-700",
  REJECTED: "bg-neutral-100 text-neutral-600",
};

const statusLabels: Record<DisputeStatus, string> = {
  OPEN: "Ouvert",
  INVESTIGATING: "Investigation",
  RESOLVED: "Résolu",
  REJECTED: "Rejeté",
};

const reasonLabels: Record<string, string> = {
  DAMAGED_ITEMS: "Objets endommagés",
  NO_SHOW: "Non-présentation",
  PAYMENT_ISSUE: "Problème de paiement",
  LATE_DELIVERY: "Livraison tardive",
  HARASSMENT: "Harcèlement",
  FRAUD: "Fraude suspectée",
  OTHER: "Autre",
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

type FilterTab = "ALL" | "OPEN" | "INVESTIGATING" | "RESOLVED";

export default function AdminDisputesPage() {
  const {
    data: disputes,
    loading,
    error,
    source,
    refetch,
  } = useAdminDisputes();
  const { t } = useI18n();
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [selectedDispute, setSelectedDispute] = useState<BackendDispute | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);

  const filterTabs: { value: FilterTab; label: string }[] = [
    { value: "ALL", label: "Tous" },
    { value: "OPEN", label: "Ouverts" },
    { value: "INVESTIGATING", label: "Investigation" },
    { value: "RESOLVED", label: "Résolus" },
  ];

  const statusFiltered =
    filter === "ALL" ? disputes : disputes.filter((d) => d.status === filter);

  const filtered = searchQuery.trim()
    ? statusFiltered.filter((d) => {
        const q = searchQuery.toLowerCase();
        return (
          String(d.id).includes(q) ||
          (d.reason || "").toLowerCase().includes(q) ||
          (d.opened_by_name || "").toLowerCase().includes(q) ||
          (d.resolved_by_name || "").toLowerCase().includes(q) ||
          (d.description || "").toLowerCase().includes(q)
        );
      })
    : statusFiltered;

  const openCount = disputes.filter((d) => d.status === "OPEN").length;
  const investigatingCount = disputes.filter(
    (d) => d.status === "INVESTIGATING",
  ).length;

  // ─── Actions ───────────────────────────────────────────────

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleInvestigate = async (id: number) => {
    setActionLoading(true);
    try {
      await investigateDispute(id);
      showFeedback("success", `🔍 Investigation ouverte sur le litige #${id}`);
      refetch();
      setSelectedDispute(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      showFeedback("error", `Échec: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = (id: number) => {
    setPendingActionId(id);
    setResolveNotes("");
    setShowResolveModal(true);
  };

  const confirmResolve = async () => {
    if (!pendingActionId || !resolveNotes.trim()) return;
    setActionLoading(true);
    try {
      await resolveDispute(pendingActionId, resolveNotes);
      showFeedback("success", `✅ Litige #${pendingActionId} résolu`);
      setShowResolveModal(false);
      setSelectedDispute(null);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      showFeedback("error", `Échec: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = (id: number) => {
    setPendingActionId(id);
    setResolveNotes("");
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!pendingActionId || !resolveNotes.trim()) return;
    setActionLoading(true);
    try {
      await rejectDispute(pendingActionId, resolveNotes);
      showFeedback("success", `❌ Litige #${pendingActionId} rejeté`);
      setShowRejectModal(false);
      setSelectedDispute(null);
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      showFeedback("error", `Échec: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Columns ──────────────────────────────────────────────

  const columns = [
    {
      key: "id",
      header: "ID",
      width: "w-16",
      render: (d: BackendDispute) => (
        <span className="font-mono text-neutral-500">#{d.id}</span>
      ),
    },
    {
      key: "job",
      header: "Mission",
      render: (d: BackendDispute) => (
        <div>
          <p className="font-medium text-neutral-900 dark:text-white text-sm">
            {reasonLabels[d.reason] || d.reason}
          </p>
          <p className="text-xs text-neutral-400">
            <Link
              href={`/admin/jobs/${d.job_summary?.id || d.job}`}
              className="hover:text-brand-600 dark:hover:text-brand-400 underline transition-colors"
            >
              Job #{d.job_summary?.id || d.job}
            </Link>
          </p>
        </div>
      ),
    },
    {
      key: "openedBy",
      header: "Ouvert par",
      render: (d: BackendDispute) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-brand-600/10">
            <User className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">
              {d.opened_by_name}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Statut",
      render: (d: BackendDispute) => (
        <StatusBadge
          status={statusLabels[d.status] || d.status}
          colorClass={
            statusColors[d.status] || "bg-neutral-100 text-neutral-600"
          }
        />
      ),
    },
    {
      key: "createdAt",
      header: "Ouvert",
      render: (d: BackendDispute) => (
        <span className="text-sm text-neutral-500">
          {formatTimeAgoShort(d.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (d: BackendDispute) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDispute(d)}
            title="Voir détails"
            className="p-1.5 rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          {d.status === "OPEN" && (
            <button
              onClick={() => handleInvestigate(d.id)}
              title="Investiguer"
              disabled={actionLoading}
              className="p-1.5 rounded-lg bg-brand-600/10 text-brand-600 hover:bg-brand-600/20 transition-colors disabled:opacity-50"
            >
              <SearchIcon className="w-4 h-4" />
            </button>
          )}
          {(d.status === "OPEN" || d.status === "INVESTIGATING") && (
            <>
              <button
                onClick={() => handleResolve(d.id)}
                title="Résoudre"
                disabled={actionLoading}
                className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleReject(d.id)}
                title="Rejeter"
                disabled={actionLoading}
                className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  // ─── Loading / Error States ───────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Chargement des litiges...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-sm text-red-600">Erreur: {error.message}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl p-4 text-sm font-medium ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800"
              : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t.disputes.title}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            {t.disputes.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Data Source Indicator */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
              source === "api"
                ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                : "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
            }`}
          >
            {source === "api" ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            {source === "api" ? "API Live" : "Mock Data"}
          </div>
          {openCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800 dark:text-red-300">
                {openCount} litige{openCount > 1 ? "s" : ""} ouvert
                {openCount > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex flex-wrap gap-2 flex-1">
          {filterTabs.map((tab) => {
            const isActive = filter === tab.value;
            const count =
              tab.value === "ALL"
                ? disputes.length
                : disputes.filter((d) => d.status === tab.value).length;
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-white dark:bg-[#1e293b] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-600"
                }`}
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
        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un litige..."
            className="pl-9 pr-4 py-2 bg-white dark:bg-[#0f172a] border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm text-neutral-900 dark:text-neutral-200 placeholder:text-neutral-400 focus:ring-2 focus:ring-brand-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">
              Total:
            </span>
            <span className="ml-2 font-semibold text-neutral-900 dark:text-white">
              {filtered.length}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">
              Ouverts:
            </span>
            <span className="ml-2 font-semibold text-red-600">{openCount}</span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">
              En investigation:
            </span>
            <span className="ml-2 font-semibold text-brand-600 dark:text-brand-400">
              {investigatingCount}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        emptyMessage="Aucun litige trouvé pour ce filtre"
      />

      {/* Detail Drawer */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="bg-white dark:bg-[#1e293b] w-full max-w-lg h-full overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                Litige #{selectedDispute.id}
              </h2>
              <button
                onClick={() => setSelectedDispute(null)}
                className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="flex items-center gap-3">
                <StatusBadge
                  status={statusLabels[selectedDispute.status]}
                  colorClass={statusColors[selectedDispute.status]}
                  size="md"
                />
                <span className="text-sm text-neutral-500">
                  Ouvert {formatTimeAgoShort(selectedDispute.created_at)}
                </span>
              </div>

              {/* Job Info */}
              <div className="bg-neutral-50 dark:bg-[#0f172a] rounded-xl p-4">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  Mission concernée
                </p>
                <p className="font-medium text-neutral-900 dark:text-white">
                  {reasonLabels[selectedDispute.reason] ||
                    selectedDispute.reason}
                </p>
                <Link
                  href={`/admin/jobs/${selectedDispute.job_summary?.id || selectedDispute.job}`}
                  className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Job #{selectedDispute.job_summary?.id || selectedDispute.job}
                </Link>
                {selectedDispute.job_summary?.pickup && (
                  <p className="text-xs text-neutral-400 mt-1">
                    {selectedDispute.job_summary.pickup} →{" "}
                    {selectedDispute.job_summary.dropoff}
                  </p>
                )}
              </div>

              {/* Opened By */}
              <div className="bg-brand-600/5 rounded-xl p-3">
                <p className="text-xs text-brand-600 mb-1">Plaignant</p>
                <p className="font-medium text-neutral-900 dark:text-white text-sm">
                  {selectedDispute.opened_by_name}
                </p>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs text-neutral-500 mb-2">
                  Description du litige
                </p>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-[#0f172a] rounded-xl p-4">
                  {selectedDispute.description}
                </p>
              </div>

              {/* Resolution Notes */}
              {selectedDispute.resolution_notes && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-xs text-green-600 mb-1">Résolution</p>
                  <p className="text-sm text-green-800">
                    {selectedDispute.resolution_notes}
                  </p>
                  {selectedDispute.resolved_by_name && (
                    <p className="text-xs text-green-600 mt-2">
                      Par {selectedDispute.resolved_by_name}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              {(selectedDispute.status === "OPEN" ||
                selectedDispute.status === "INVESTIGATING") && (
                <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-700">
                  {selectedDispute.status === "OPEN" && (
                    <button
                      onClick={() => handleInvestigate(selectedDispute.id)}
                      disabled={actionLoading}
                      className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-medium hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <SearchIcon className="w-4 h-4" />
                      )}
                      Investiguer
                    </button>
                  )}
                  <button
                    onClick={() => handleResolve(selectedDispute.id)}
                    disabled={actionLoading}
                    className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Résoudre
                  </button>
                  <button
                    onClick={() => handleReject(selectedDispute.id)}
                    disabled={actionLoading}
                    className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Rejeter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl max-w-md w-full p-6 border border-neutral-200 dark:border-neutral-700">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
              Résoudre le litige #{pendingActionId}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              Décrivez la résolution. Le résultat sera enregistré dans
              l&apos;audit trail.
            </p>
            <textarea
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="Notes de résolution (min. 10 caractères)..."
              rows={3}
              className="w-full border border-neutral-200 dark:border-neutral-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-[#0f172a] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowResolveModal(false)}
                className="flex-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 py-2.5 rounded-xl font-medium hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmResolve}
                disabled={resolveNotes.trim().length < 10 || actionLoading}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl max-w-md w-full p-6 border border-neutral-200 dark:border-neutral-700">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
              Rejeter le litige #{pendingActionId}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              Indiquez la raison du rejet. Les deux parties seront notifiées.
            </p>
            <textarea
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="Raison du rejet (min. 10 caractères)..."
              rows={3}
              className="w-full border border-neutral-200 dark:border-neutral-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-[#0f172a] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 py-2.5 rounded-xl font-medium hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmReject}
                disabled={resolveNotes.trim().length < 10 || actionLoading}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
