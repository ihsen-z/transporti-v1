"use client";

import { useState } from "react";
import DataTable from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import { formatTimeAgoShort } from "@/lib/admin";
import { useAdminReviews } from "@/hooks/useAdminData";
import {
  toggleReviewVisibility,
  type BackendReview,
  type BackendReviewAbuseLog,
} from "@/lib/services/admin";
import {
  Star,
  Flag,
  Eye,
  EyeOff,
  AlertTriangle,
  User,
  MessageSquare,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Config                                                                     */
/* -------------------------------------------------------------------------- */

const severityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-orange-100 text-orange-700",
  HIGH: "bg-red-100 text-red-700",
  CRITICAL: "bg-red-200 text-red-800 font-bold",
};

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((v) => (
        <Star
          key={v}
          className={`w-3.5 h-3.5 ${v <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}`}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

type FilterTab = "ALL" | "VISIBLE" | "HIDDEN";

export default function AdminReviewsPage() {
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [selectedReview, setSelectedReview] = useState<BackendReview | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState(false);

  const {
    data: allReviews,
    source,
    loading,
    error,
    refetch,
  } = useAdminReviews();

  const filterTabs: { value: FilterTab; label: string }[] = [
    { value: "ALL", label: "Tous" },
    { value: "VISIBLE", label: "Visibles" },
    { value: "HIDDEN", label: "Masqués" },
  ];

  const filtered =
    filter === "ALL"
      ? allReviews
      : filter === "VISIBLE"
        ? allReviews.filter((r) => !r.isHidden)
        : allReviews.filter((r) => r.isHidden);

  const handleToggleVisibility = async (id: number) => {
    setActionLoading(true);
    try {
      await toggleReviewVisibility(id);
      refetch();
    } catch (err) {
      alert(
        `Erreur: ${err instanceof Error ? err.message : "Erreur inconnue"}`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleWarnUser = (reviewerEmail: string) => {
    alert(
      `⚠️ Avertissement envoyé à ${reviewerEmail} (fonctionnalité à venir)`,
    );
  };

  const columns = [
    {
      key: "id",
      header: "ID",
      width: "w-16",
      render: (r: BackendReview) => (
        <span className="font-mono text-slate-500">#{r.id}</span>
      ),
    },
    {
      key: "reviewer",
      header: "Auteur",
      render: (r: BackendReview) => (
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              r.role === "CLIENT" ? "bg-blue-100" : "bg-purple-100"
            }`}
          >
            <User
              className={`w-4 h-4 ${r.role === "CLIENT" ? "text-blue-600" : "text-purple-600"}`}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">
              {r.reviewerName}
            </p>
            <p className="text-xs text-slate-400">
              {r.role === "CLIENT" ? "Client" : "Transporteur"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "target",
      header: "Cible",
      render: (r: BackendReview) => (
        <span className="text-sm text-slate-700">{r.targetName}</span>
      ),
    },
    {
      key: "rating",
      header: "Note",
      render: (r: BackendReview) => <StarDisplay rating={r.rating} />,
    },
    {
      key: "flagReason",
      header: "Signalement",
      render: (r: BackendReview) =>
        r.flagReason ? (
          <div className="flex items-center gap-1.5">
            <Flag className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs text-red-700 font-medium">
              {r.flagReason}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: "visibility",
      header: "Visibilité",
      render: (r: BackendReview) => (
        <StatusBadge
          status={r.isHidden ? "Masqué" : "Visible"}
          colorClass={
            r.isHidden
              ? "bg-slate-100 text-slate-600"
              : "bg-green-100 text-green-700"
          }
        />
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      render: (r: BackendReview) => (
        <span className="text-sm text-slate-500">
          {r.createdAt ? formatTimeAgoShort(r.createdAt) : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r: BackendReview) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedReview(r)}
            title="Voir détails"
            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleVisibility(r.id)}
            disabled={actionLoading}
            title={r.isHidden ? "Rendre visible" : "Masquer"}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
              r.isHidden
                ? "bg-green-100 text-green-600 hover:bg-green-200"
                : "bg-red-100 text-red-600 hover:bg-red-200"
            }`}
          >
            {r.isHidden ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => handleWarnUser(r.reviewerEmail)}
            title="Avertir l'utilisateur"
            className="p-1.5 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Modération des avis
          </h1>
          <p className="text-slate-500">
            Avis signalés pour contenu abusif ou frauduleux
          </p>
        </div>
        {/* Source Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            source === "api"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-orange-50 text-orange-700 border border-orange-200"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${source === "api" ? "bg-green-500" : "bg-orange-500"}`}
          />
          {source === "api" ? "API Live" : "Mock Data"}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-slate-500">Chargement des avis...</p>
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
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => {
              const isActive = filter === tab.value;
              const count =
                tab.value === "ALL"
                  ? allReviews.length
                  : tab.value === "VISIBLE"
                    ? allReviews.filter((r) => !r.isHidden).length
                    : allReviews.filter((r) => r.isHidden).length;
              return (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary-600 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded text-xs ${isActive ? "bg-white/20" : "bg-slate-100"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Stats Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-slate-500">Total:</span>
                <span className="ml-2 font-semibold text-slate-900">
                  {allReviews.length}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Visibles:</span>
                <span className="ml-2 font-semibold text-green-600">
                  {allReviews.filter((r) => !r.isHidden).length}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Masqués:</span>
                <span className="ml-2 font-semibold text-red-600">
                  {allReviews.filter((r) => r.isHidden).length}
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <DataTable
            columns={columns}
            data={filtered}
            emptyMessage="Aucun avis trouvé"
          />
        </>
      )}

      {/* Detail Drawer */}
      {selectedReview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Avis #{selectedReview.id}
              </h2>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Rating */}
              <div className="flex items-center gap-3">
                <StarDisplay rating={selectedReview.rating} />
                <span className="text-lg font-bold text-slate-900">
                  {selectedReview.rating}/5
                </span>
                <StatusBadge
                  status={selectedReview.isHidden ? "Masqué" : "Visible"}
                  colorClass={
                    selectedReview.isHidden
                      ? "bg-slate-100 text-slate-600"
                      : "bg-green-100 text-green-700"
                  }
                />
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Auteur</p>
                  <p className="font-medium text-slate-900 text-sm">
                    {selectedReview.reviewerName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {selectedReview.reviewerEmail}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">Cible</p>
                  <p className="font-medium text-slate-900 text-sm">
                    {selectedReview.targetName}
                  </p>
                  <p className="text-xs text-slate-400">
                    Job #{selectedReview.jobId}
                  </p>
                </div>
              </div>

              {/* Comment */}
              <div>
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Commentaire
                </p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4 italic">
                  &ldquo;{selectedReview.comment}&rdquo;
                </p>
              </div>

              {/* Flag Reason */}
              {selectedReview.flagReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <Flag className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-900">
                      {selectedReview.flagReason}
                    </p>
                  </div>
                </div>
              )}

              {/* Abuse Logs */}
              {selectedReview.abuseLogs &&
                selectedReview.abuseLogs.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">
                      Détections d&apos;abus
                    </p>
                    <div className="space-y-2">
                      {selectedReview.abuseLogs.map(
                        (log: BackendReviewAbuseLog, idx: number) => (
                          <div
                            key={idx}
                            className="bg-white border border-slate-100 rounded-xl p-3"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <StatusBadge
                                status={log.severity}
                                colorClass={
                                  severityColors[log.severity] ||
                                  severityColors.MEDIUM
                                }
                              />
                              <span className="text-xs font-mono text-slate-500">
                                {log.detector}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600">
                              {log.reason}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    handleToggleVisibility(selectedReview.id);
                    setSelectedReview(null);
                  }}
                  disabled={actionLoading}
                  className={`flex-1 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                    selectedReview.isHidden
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {selectedReview.isHidden ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                  {selectedReview.isHidden
                    ? "Rendre visible"
                    : "Masquer l'avis"}
                </button>
                <button
                  onClick={() => {
                    handleWarnUser(selectedReview.reviewerEmail);
                    setSelectedReview(null);
                  }}
                  className="flex-1 bg-orange-600 text-white py-2.5 rounded-xl font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Avertir l&apos;auteur
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
