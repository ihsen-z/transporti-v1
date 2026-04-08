"use client";

import { useState } from "react";
import DataTable from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import DocumentReviewDrawer from "@/components/admin/DocumentReviewDrawer";
import { formatTimeAgoShort } from "@/lib/admin";
import { useAdminVerifications, useAdminProfiles } from "@/hooks/useAdminData";
import {
  approveVerification,
  rejectVerification,
  type BackendVerification,
  type AdminTrustProfile,
} from "@/lib/services/admin";
import {
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  User,
  FolderOpen,
  Shield,
  Users,
  ClipboardList,
} from "lucide-react";

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

const profileStatusLabels: Record<string, { label: string; color: string }> = {
  UNVERIFIED: { label: "Non vérifié", color: "bg-slate-100 text-slate-600" },
  PENDING: { label: "En attente", color: "bg-orange-100 text-orange-700" },
  PARTIALLY_REVIEWED: {
    label: "Partiellement vérifié",
    color: "bg-blue-100 text-blue-700",
  },
  VERIFIED: { label: "Vérifié", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejeté", color: "bg-red-100 text-red-700" },
  SUSPENDED: { label: "Suspendu", color: "bg-slate-200 text-slate-800" },
};

/* -------------------------------------------------------------------------- */
/*  Sub-filter types                                                           */
/* -------------------------------------------------------------------------- */

type VerifFilterTab = "ALL" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
type ProfileFilterTab =
  | "ALL"
  | "UNVERIFIED"
  | "PENDING"
  | "PARTIALLY_REVIEWED"
  | "VERIFIED"
  | "REJECTED";

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

type MainView = "requests" | "profiles";

export default function AdminVerificationsPage() {
  const [mainView, setMainView] = useState<MainView>("profiles");
  const [verifFilter, setVerifFilter] = useState<VerifFilterTab>("ALL");
  const [profileFilter, setProfileFilter] = useState<ProfileFilterTab>("ALL");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [drawerProfileId, setDrawerProfileId] = useState<number | null>(null);

  // Data hooks
  const {
    data: allVerifications,
    source: verifSource,
    loading: verifLoading,
    error: verifError,
    refetch: refetchVerifications,
  } = useAdminVerifications();

  const {
    data: allProfiles,
    source: profileSource,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfiles,
  } = useAdminProfiles();

  const source = mainView === "requests" ? verifSource : profileSource;

  // ── Verification request handlers ──
  const handleApprove = async (id: number) => {
    setActionLoading(true);
    try {
      await approveVerification(id);
      refetchVerifications();
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
      refetchVerifications();
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

  // ── Requests filters ──
  const verifFilterTabs: { value: VerifFilterTab; label: string }[] = [
    { value: "ALL", label: "Toutes" },
    { value: "PENDING_REVIEW", label: "En attente" },
    { value: "APPROVED", label: "Approuvées" },
    { value: "REJECTED", label: "Rejetées" },
  ];

  const filteredVerifications =
    verifFilter === "ALL"
      ? allVerifications
      : allVerifications.filter((v) => v.status === verifFilter);

  const pendingCount = allVerifications.filter(
    (v) => v.status === "PENDING_REVIEW",
  ).length;

  // ── Profile filters ──
  const profileFilterTabs: { value: ProfileFilterTab; label: string }[] = [
    { value: "ALL", label: "Tous" },
    { value: "UNVERIFIED", label: "Non vérifiés" },
    { value: "PENDING", label: "En attente" },
    { value: "PARTIALLY_REVIEWED", label: "En cours" },
    { value: "VERIFIED", label: "Vérifiés" },
    { value: "REJECTED", label: "Rejetés" },
  ];

  const filteredProfiles =
    profileFilter === "ALL"
      ? allProfiles
      : allProfiles.filter((p) => p.verificationStatus === profileFilter);

  const profilesWithDocs = allProfiles.filter((p) => p.documentCount > 0);
  const profilesNeedingReview = allProfiles.filter((p) => p.pendingCount > 0);

  // ── Columns: Verification Requests ──
  const verifColumns = [
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
          <button
            onClick={() => setDrawerProfileId(v.profileId)}
            title={
              v.documentCount > 0
                ? `Voir les ${v.documentCount} documents`
                : "Voir les documents"
            }
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              v.documentCount > 0
                ? "bg-purple-100 text-purple-600 hover:bg-purple-200"
                : "bg-slate-50 text-slate-400 hover:bg-slate-100"
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            {v.documentCount > 0 && (
              <span className="text-xs font-medium">{v.documentCount}</span>
            )}
          </button>
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

  // ── Columns: Profiles ──
  const profileColumns = [
    {
      key: "id",
      header: "ID",
      width: "w-16",
      render: (p: AdminTrustProfile) => (
        <span className="font-mono text-slate-500">#{p.id}</span>
      ),
    },
    {
      key: "transporter",
      header: "Transporteur",
      render: (p: AdminTrustProfile) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="font-medium text-slate-900">{p.transporterName}</p>
            <p className="text-xs text-slate-500">{p.transporterEmail}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Statut",
      render: (p: AdminTrustProfile) => {
        const cfg = profileStatusLabels[p.verificationStatus] || {
          label: p.verificationStatus,
          color: "bg-slate-100 text-slate-600",
        };
        return <StatusBadge status={cfg.label} colorClass={cfg.color} />;
      },
    },
    {
      key: "documents",
      header: "Documents",
      render: (p: AdminTrustProfile) => (
        <div className="flex items-center gap-2">
          {p.documentCount > 0 ? (
            <>
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-green-600">
                  {p.approvedCount}
                </span>
                <span className="text-slate-300">/</span>
                <span
                  className={`text-xs font-semibold ${p.rejectedCount > 0 ? "text-red-600" : "text-slate-400"}`}
                >
                  {p.rejectedCount}
                </span>
                <span className="text-slate-300">/</span>
                <span
                  className={`text-xs font-semibold ${p.pendingCount > 0 ? "text-orange-600" : "text-slate-400"}`}
                >
                  {p.pendingCount}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">A/R/P</span>
            </>
          ) : (
            <span className="text-xs text-slate-400">Aucun</span>
          )}
        </div>
      ),
    },
    {
      key: "trustScore",
      header: "Confiance",
      render: (p: AdminTrustProfile) => (
        <span
          className={`text-sm font-semibold ${
            p.trustScore >= 80
              ? "text-green-600"
              : p.trustScore >= 50
                ? "text-orange-600"
                : "text-red-600"
          }`}
        >
          {p.trustScore}/100
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Inscrit",
      render: (p: AdminTrustProfile) => (
        <span className="text-sm text-slate-500">
          {p.createdAt ? formatTimeAgoShort(p.createdAt) : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (p: AdminTrustProfile) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerProfileId(p.id)}
            title={
              p.documentCount > 0
                ? `Voir les ${p.documentCount} documents`
                : "Voir les documents"
            }
            className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              p.pendingCount > 0
                ? "bg-orange-100 text-orange-600 hover:bg-orange-200 ring-1 ring-orange-300"
                : p.documentCount > 0
                  ? "bg-purple-100 text-purple-600 hover:bg-purple-200"
                  : "bg-slate-50 text-slate-400 hover:bg-slate-100"
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            {p.documentCount > 0 && (
              <span className="text-xs font-medium">{p.documentCount}</span>
            )}
          </button>
        </div>
      ),
    },
  ];

  const loading = mainView === "requests" ? verifLoading : profileLoading;
  const error = mainView === "requests" ? verifError : profileError;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vérifications</h1>
          <p className="text-slate-500">
            Gestion des profils et documents transporteurs
          </p>
        </div>
        <div className="flex items-center gap-3">
          {profilesNeedingReview.length > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-lg">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                {profilesNeedingReview.length} profil
                {profilesNeedingReview.length > 1 ? "s" : ""} à vérifier
              </span>
            </div>
          )}
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

      {/* Main View Toggle */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        <button
          onClick={() => setMainView("profiles")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mainView === "profiles"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="w-4 h-4" />
          Profils transporteurs
          <span
            className={`px-1.5 py-0.5 rounded text-xs ${
              mainView === "profiles"
                ? "bg-primary-100 text-primary-700"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {allProfiles.length}
          </span>
        </button>
        <button
          onClick={() => setMainView("requests")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            mainView === "requests"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Demandes de vérification
          <span
            className={`px-1.5 py-0.5 rounded text-xs ${
              mainView === "requests"
                ? "bg-primary-100 text-primary-700"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {allVerifications.length}
          </span>
          {pendingCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-slate-500">Chargement...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          ⚠️ Erreur de chargement: {error?.message}
        </div>
      )}

      {/* ─── PROFILES VIEW ─── */}
      {!loading && mainView === "profiles" && (
        <>
          {/* Profile Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {profileFilterTabs.map((tab) => {
              const isActive = profileFilter === tab.value;
              const count =
                tab.value === "ALL"
                  ? allProfiles.length
                  : allProfiles.filter(
                      (p) => p.verificationStatus === tab.value,
                    ).length;
              return (
                <button
                  key={tab.value}
                  onClick={() => setProfileFilter(tab.value)}
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

          {/* Profile Stats Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-slate-500">Affichés:</span>
                <span className="ml-2 font-semibold text-slate-900">
                  {filteredProfiles.length}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Avec documents:</span>
                <span className="ml-2 font-semibold text-purple-600">
                  {profilesWithDocs.length}
                </span>
              </div>
              <div>
                <span className="text-slate-500">À vérifier:</span>
                <span className="ml-2 font-semibold text-orange-600">
                  {profilesNeedingReview.length}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Vérifiés:</span>
                <span className="ml-2 font-semibold text-green-600">
                  {
                    allProfiles.filter(
                      (p) => p.verificationStatus === "VERIFIED",
                    ).length
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Profiles Table */}
          <DataTable
            columns={profileColumns}
            data={filteredProfiles}
            emptyMessage="Aucun profil transporteur trouvé"
          />
        </>
      )}

      {/* ─── REQUESTS VIEW ─── */}
      {!loading && mainView === "requests" && (
        <>
          {/* Verification Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {verifFilterTabs.map((tab) => {
              const isActive = verifFilter === tab.value;
              const count =
                tab.value === "ALL"
                  ? allVerifications.length
                  : allVerifications.filter((v) => v.status === tab.value)
                      .length;
              return (
                <button
                  key={tab.value}
                  onClick={() => setVerifFilter(tab.value)}
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
                  {filteredVerifications.length}
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

          {/* Verifications Table */}
          <DataTable
            columns={verifColumns}
            data={filteredVerifications}
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

      {/* Document Review Drawer */}
      {drawerProfileId !== null && (
        <DocumentReviewDrawer
          profileId={drawerProfileId}
          onClose={() => setDrawerProfileId(null)}
          onStatusChanged={() => {
            refetchVerifications();
            refetchProfiles();
          }}
        />
      )}
    </div>
  );
}
