"use client";

import { useState } from "react";
import DataTable from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import { formatTimeAgoShort } from "@/lib/admin";
import { useAdminVerifications } from "@/hooks/useAdminData";
import {
  approveVerification,
  rejectVerification,
  type BackendVerification,
} from "@/lib/services/admin";
import { Eye, CheckCircle, XCircle, Clock, FileText, User } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types & Config                                                             */
/* -------------------------------------------------------------------------- */

type VerificationStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

const statusColors: Record<VerificationStatus, string> = {
  PENDING_REVIEW: "bg-orange-100 text-orange-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const statusLabels: Record<VerificationStatus, string> = {
  PENDING_REVIEW: "En attente",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

type FilterTab = "ALL" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export default function AdminVerificationsPage() {
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const {
    data: allVerifications,
    source,
    loading,
    error,
    refetch,
  } = useAdminVerifications();

  const filterTabs: { value: FilterTab; label: string }[] = [
    { value: "ALL", label: "Toutes" },
    { value: "PENDING_REVIEW", label: "En attente" },
    { value: "APPROVED", label: "Approuvées" },
    { value: "REJECTED", label: "Rejetées" },
  ];

  const filtered =
    filter === "ALL"
      ? allVerifications
      : allVerifications.filter((v) => v.status === filter);

  const pendingCount = allVerifications.filter(
    (v) => v.status === "PENDING_REVIEW",
  ).length;

  const handleApprove = async (id: number) => {
    setActionLoading(true);
    try {
      await approveVerification(id);
      refetch();
    } catch (err) {
      alert(
        `Erreur: ${err instanceof Error ? err.message : "Erreur inconnue"}`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = (id: number) => {
    setSelectedId(id);
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedId || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await rejectVerification(selectedId, rejectReason);
      refetch();
    } catch (err) {
      alert(
        `Erreur: ${err instanceof Error ? err.message : "Erreur inconnue"}`,
      );
    } finally {
      setActionLoading(false);
      setShowRejectModal(false);
      setRejectReason("");
      setSelectedId(null);
    }
  };

  const columns = [
    {
      key: "id",
      header: "ID",
      width: "w-16",
      render: (v: BackendVerification) => (
        <span className="font-mono text-slate-500">#{v.id}</span>
      ),
    },
    {
      key: "transporter",
      header: "Transporteur",
      render: (v: BackendVerification) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{v.transporterName}</p>
            <p className="text-xs text-slate-500">{v.transporterEmail}</p>
          </div>
        </div>
      ),
    },
    {
      key: "documentType",
      header: "Document",
      render: (v: BackendVerification) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <span className="text-sm">{v.documentType}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Statut",
      render: (v: BackendVerification) => (
        <StatusBadge
          status={statusLabels[v.status] || v.status}
          colorClass={statusColors[v.status] || "bg-slate-100 text-slate-600"}
        />
      ),
    },
    {
      key: "trustScore",
      header: "Confiance",
      render: (v: BackendVerification) => (
        <span
          className={`text-sm font-semibold ${
            v.trustScore >= 80
              ? "text-green-600"
              : v.trustScore >= 50
                ? "text-orange-600"
                : "text-red-600"
          }`}
        >
          {v.trustScore}/100
        </span>
      ),
    },
    {
      key: "submittedAt",
      header: "Soumis",
      render: (v: BackendVerification) => (
        <span className="text-sm text-slate-500">
          {v.submittedAt ? formatTimeAgoShort(v.submittedAt) : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (v: BackendVerification) => (
        <div className="flex items-center gap-2">
          {v.documentUrl && (
            <a
              href={
                v.documentUrl.startsWith("http")
                  ? v.documentUrl
                  : `http://localhost:8000${v.documentUrl}`
              }
              target="_blank"
              rel="noopener noreferrer"
              title="Voir le document"
              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <Eye className="w-4 h-4" />
            </a>
          )}
          {v.status === "PENDING_REVIEW" && (
            <>
              <button
                onClick={() => handleApprove(v.id)}
                disabled={actionLoading}
                title="Approuver"
                className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleReject(v.id)}
                disabled={actionLoading}
                title="Rejeter"
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vérifications</h1>
          <p className="text-slate-500">
            File de vérification des transporteurs
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-lg">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                {pendingCount} demande{pendingCount > 1 ? "s" : ""} en attente
              </span>
            </div>
          )}
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
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-slate-500">Chargement des vérifications...</p>
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
                  ? allVerifications.length
                  : allVerifications.filter((v) => v.status === tab.value)
                      .length;
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
                <span className="text-slate-500">Affichées:</span>
                <span className="ml-2 font-semibold text-slate-900">
                  {filtered.length}
                </span>
              </div>
              <div>
                <span className="text-slate-500">En attente:</span>
                <span className="ml-2 font-semibold text-orange-600">
                  {pendingCount}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Approuvées:</span>
                <span className="ml-2 font-semibold text-green-600">
                  {
                    allVerifications.filter((v) => v.status === "APPROVED")
                      .length
                  }
                </span>
              </div>
              <div>
                <span className="text-slate-500">Rejetées:</span>
                <span className="ml-2 font-semibold text-red-600">
                  {
                    allVerifications.filter((v) => v.status === "REJECTED")
                      .length
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Table */}
          <DataTable
            columns={columns}
            data={filtered}
            emptyMessage="Aucune demande de vérification trouvée"
          />
        </>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Rejeter la vérification
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Indiquez la raison du rejet. Le transporteur sera notifié.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Raison du rejet..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? "En cours..." : "Confirmer le rejet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
