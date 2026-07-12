"use client";

import { useState, useCallback, useEffect } from "react";
import DataTable from "@/components/admin/DataTable";
import Pagination from "@/components/admin/Pagination";
import {
  UserStatusBadge,
  RoleBadge,
  TrustBadge,
} from "@/components/admin/StatusBadge";
import { useAdminUsers } from "@/hooks/useAdminData";
import {
  formatDate,
  formatTimeAgoShort,
  formatCurrency,
} from "@/lib/format";
import { type AdminUser } from "@/lib/services/types";
import {
  suspendUser,
  activateUser,
  resetUserPassword,
  editUser,
} from "@/lib/services/admin";
import {
  Search,
  Ban,
  CheckCircle,
  KeyRound,
  X,
  AlertTriangle,
  Copy,
  ShieldAlert,
  Download,
  Eye,
  Briefcase,
  MessageSquare,
  Star,
  Pencil,
  Loader2,
  Save,
  CheckSquare,
  Square,
  MinusSquare,
} from "lucide-react";
import { apiClient, ApiError, getErrorMessage } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/useAppI18n";

type RoleFilter = "ALL" | "CLIENT" | "TRANSPORTER";

// roleTabs moved inside component for i18n

/* -------------------------------------------------------------------------- */
/*  Confirmation Modal                                                         */
/* -------------------------------------------------------------------------- */

type ModalAction = "suspend" | "activate" | "resetPassword" | null;

interface ActionModalProps {
  action: ModalAction;
  user: AdminUser | null;
  reason: string;
  onReasonChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}

function ActionModal({
  action,
  user,
  reason,
  onReasonChange,
  onConfirm,
  onClose,
  loading,
}: ActionModalProps) {
  if (!action || !user) return null;

  const config = {
    suspend: {
      title: "Suspendre l'utilisateur",
      description: `Êtes-vous sûr de vouloir suspendre le compte de ${user.name} (${user.email}) ? L'utilisateur ne pourra plus se connecter.`,
      confirmLabel: "Suspendre",
      confirmClass: "bg-red-600 hover:bg-red-700 text-white",
      icon: <Ban className="w-6 h-6 text-red-500" />,
      showReason: true,
    },
    activate: {
      title: "Réactiver l'utilisateur",
      description: `Réactiver le compte de ${user.name} (${user.email}) ? L'utilisateur pourra à nouveau se connecter.`,
      confirmLabel: "Réactiver",
      confirmClass: "bg-green-600 hover:bg-green-700 text-white",
      icon: <CheckCircle className="w-6 h-6 text-green-500" />,
      showReason: false,
    },
    resetPassword: {
      title: "Réinitialiser le mot de passe",
      description: `Générer un nouveau mot de passe temporaire pour ${user.name} (${user.email}) ? L'ancien mot de passe sera invalidé.`,
      confirmLabel: "Réinitialiser",
      confirmClass: "bg-amber-600 hover:bg-amber-700 text-white",
      icon: <KeyRound className="w-6 h-6 text-amber-500" />,
      showReason: false,
    },
  };

  const c = config[action];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-neutral-200 dark:border-neutral-700">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            {c.icon}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-neutral-900 dark:text-white">
              {c.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {c.description}
          </p>

          {c.showReason && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Raison (optionnel)
              </label>
              <textarea
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-xl text-sm bg-white dark:bg-[#0f172a] text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                placeholder="Raison de la suspension..."
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-[#0f172a]">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 bg-white dark:bg-[#1e293b] border border-neutral-300 dark:border-neutral-600 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ${c.confirmClass}`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                En cours...
              </span>
            ) : (
              c.confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Result Toast (temp password display)                                       */
/* -------------------------------------------------------------------------- */

function ResultBanner({
  message,
  tempPassword,
  onClose,
}: {
  message: string;
  tempPassword?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-green-800">{message}</p>
        {tempPassword && (
          <div className="mt-2 flex items-center gap-2">
            <code className="px-3 py-1.5 bg-green-100 rounded-lg text-sm font-mono font-bold text-green-900 select-all">
              {tempPassword}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(tempPassword);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="p-1.5 hover:bg-green-100 rounded-lg transition-colors"
              title="Copier"
            >
              <Copy className="w-4 h-4 text-green-600" />
            </button>
            {copied && (
              <span className="text-xs text-green-600 font-medium">
                Copié !
              </span>
            )}
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        className="p-1 hover:bg-green-100 rounded transition-colors"
      >
        <X className="w-4 h-4 text-green-500" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  User Detail Drawer (R5)                                                    */
/* -------------------------------------------------------------------------- */

interface UserDetail {
  id: number;
  email: string;
  name: string;
  role: string;
  phone: string;
  isActive: boolean;
  dateJoined: string;
  trustScore: number;
  trustLevel: string;
  jobs: { id: number; title: string; status: string; createdAt: string }[];
  disputes: { id: number; reason: string; status: string; createdAt: string }[];
  reviews: { id: number; rating: number; comment: string; createdAt: string }[];
}

function UserDetailDrawer({
  userId,
  onClose,
  onUserUpdated,
}: {
  userId: number | null;
  onClose: () => void;
  onUserUpdated?: () => void;
}) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone: "", role: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    apiClient
      .get<UserDetail>(`/api/admin/users/${userId}/`)
      .then((data) => setDetail(data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-50 transition-opacity"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-[#1e293b] z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#1e293b] border-b border-neutral-100 dark:border-neutral-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-brand-600" />
            Profil Utilisateur
          </h2>
          <div className="flex items-center gap-2">
            {detail && !isEditing && (
              <button
                onClick={() => {
                  const nameParts = (detail.name || "").split(" ");
                  setEditForm({
                    first_name: nameParts[0] || "",
                    last_name: nameParts.slice(1).join(" ") || "",
                    phone: detail.phone || "",
                    role: detail.role || "CLIENT",
                  });
                  setIsEditing(true);
                  setEditSuccess(null);
                  setEditError(null);
                }}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors text-brand-600"
                title="Modifier"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
          </div>
        )}

        {!loading && detail && (
          <div className="p-6 space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 text-xl font-bold">
                {(detail.name?.[0] || detail.email[0]).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {detail.name}
                </h3>
                <p className="text-sm text-neutral-500">{detail.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      detail.role === "CLIENT"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-purple-50 text-purple-700"
                    }`}
                  >
                    {detail.role === "CLIENT" ? "Client" : "Transporteur"}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      detail.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {detail.isActive ? "Actif" : "Suspendu"}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Form */}
            {isEditing && (
              <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-200 dark:border-brand-800 p-4 space-y-3">
                <h4 className="text-sm font-bold text-brand-800 dark:text-brand-300 flex items-center gap-2">
                  <Pencil className="w-3.5 h-3.5" />
                  Modifier l'utilisateur
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Prénom</label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Nom</label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Rôle</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="CLIENT">Client</option>
                    <option value="TRANSPORTER">Transporteur</option>
                  </select>
                </div>
                {editError && (
                  <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-2">{editError}</p>
                )}
                {editSuccess && (
                  <p className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg p-2">{editSuccess}</p>
                )}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => { setIsEditing(false); setEditError(null); }}
                    disabled={editLoading}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={async () => {
                      setEditLoading(true);
                      setEditError(null);
                      try {
                        const result = await editUser(detail.id, editForm);
                        setEditSuccess(result.message);
                        setIsEditing(false);
                        // Refresh detail
                        const refreshed = await apiClient.get<UserDetail>(`/api/admin/users/${detail.id}/`);
                        setDetail(refreshed);
                        onUserUpdated?.();
                      } catch (err: unknown) {
                        setEditError(getErrorMessage(err) || "Erreur lors de la modification");
                      } finally {
                        setEditLoading(false);
                      }
                    }}
                    disabled={editLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Enregistrer
                  </button>
                </div>
              </div>
            )}


            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-50 rounded-xl p-4">
                <p className="text-xs text-neutral-400 uppercase tracking-wide">
                  Téléphone
                </p>
                <p className="text-sm font-semibold text-neutral-800 mt-1">
                  {detail.phone || "—"}
                </p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-4">
                <p className="text-xs text-neutral-400 uppercase tracking-wide">
                  Confiance
                </p>
                <p className="text-sm font-semibold text-neutral-800 mt-1">
                  {detail.trustScore}/100
                  <span className="text-xs text-neutral-400 ms-1">
                    {detail.trustLevel}
                  </span>
                </p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-4">
                <p className="text-xs text-neutral-400 uppercase tracking-wide">
                  Inscrit le
                </p>
                <p className="text-sm font-semibold text-neutral-800 mt-1">
                  {new Date(detail.dateJoined).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="bg-neutral-50 rounded-xl p-4">
                <p className="text-xs text-neutral-400 uppercase tracking-wide">
                  ID
                </p>
                <p className="text-sm font-semibold text-neutral-800 mt-1">
                  #{detail.id}
                </p>
              </div>
            </div>

            {/* Jobs */}
            <div>
              <h4 className="text-sm font-bold text-neutral-700 flex items-center gap-2 mb-3">
                <Briefcase className="w-4 h-4" />
                Historique Jobs ({detail.jobs.length})
              </h4>
              {detail.jobs.length === 0 ? (
                <p className="text-sm text-neutral-400 italic">Aucun job</p>
              ) : (
                <div className="space-y-2">
                  {detail.jobs.slice(0, 10).map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between bg-neutral-50 rounded-lg px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-neutral-800">
                          #{job.id} — {job.title}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {new Date(job.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-neutral-200 text-neutral-600">
                        {job.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Disputes */}
            <div>
              <h4 className="text-sm font-bold text-neutral-700 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" />
                Litiges ({detail.disputes.length})
              </h4>
              {detail.disputes.length === 0 ? (
                <p className="text-sm text-neutral-400 italic">Aucun litige</p>
              ) : (
                <div className="space-y-2">
                  {detail.disputes.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-neutral-800">
                          #{d.id} — {d.reason}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800">
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reviews */}
            <div>
              <h4 className="text-sm font-bold text-neutral-700 flex items-center gap-2 mb-3">
                <Star className="w-4 h-4" />
                Avis ({detail.reviews.length})
              </h4>
              {detail.reviews.length === 0 ? (
                <p className="text-sm text-neutral-400 italic">Aucun avis</p>
              ) : (
                <div className="space-y-2">
                  {detail.reviews.map((r) => (
                    <div
                      key={r.id}
                      className="bg-neutral-50 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= r.rating
                                ? "text-amber-400 fill-amber-400"
                                : "text-neutral-300"
                            }`}
                          />
                        ))}
                        <span className="text-xs text-neutral-400 ms-2">
                          {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-neutral-600 mt-1">
                          {r.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && !detail && (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
            <AlertTriangle className="w-10 h-10 mb-2" />
            <p>Impossible de charger le profil</p>
          </div>
        )}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function AdminUsersPage() {
  const [filter, setFilter] = useState<RoleFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 25;
  const { t } = useI18n();

  // Server-side paginated fetch
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(PAGE_SIZE));
      if (filter !== "ALL") params.set("role", filter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const response = await apiClient.get<any>(
        `/api/admin/users/?${params.toString()}`,
      );
      setAllUsers(response.results || []);
      setTotalPages(response.totalPages || 1);
      setTotalCount(response.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erreur de chargement"));
    } finally {
      setLoading(false);
    }
  }, [page, filter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page on filter/search change
  const handleFilterChange = (newFilter: RoleFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const refetch = fetchUsers;

  const roleTabs: { value: RoleFilter; label: string }[] = [
    { value: "ALL", label: t.users.all },
    { value: "CLIENT", label: t.users.clients },
    { value: "TRANSPORTER", label: t.users.transporters },
  ];

  // Use the server-filtered data directly (no client-side filtering needed)
  const filteredUsers = allUsers;

  // Action state
  const [modalAction, setModalAction] = useState<ModalAction>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [resultBanner, setResultBanner] = useState<{
    message: string;
    tempPassword?: string;
  } | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // R5: Detail drawer state
  const [detailUserId, setDetailUserId] = useState<number | null>(null);

  // U5: Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map((u) => u.id)));
    }
  }, [selectedIds.size, filteredUsers]);

  const handleBulkAction = useCallback(
    async (action: "suspend" | "activate") => {
      if (selectedIds.size === 0) return;
      setBulkLoading(true);
      let successCount = 0;
      let failCount = 0;
      for (const id of Array.from(selectedIds)) {
        try {
          if (action === "suspend") {
            await suspendUser(id, "Bulk admin action");
          } else {
            await activateUser(id);
          }
          successCount++;
        } catch {
          failCount++;
        }
      }
      setBulkLoading(false);
      setSelectedIds(new Set());
      setResultBanner({
        message: `✅ ${successCount} utilisateur(s) ${action === "suspend" ? "suspendu(s)" : "activé(s)"}${failCount > 0 ? ` — ${failCount} échec(s)` : ""}`,
      });
      refetch();
    },
    [selectedIds, refetch],
  );

  // Source indicator (always API now)
  const source = "api" as const;

  // Open action modal
  const openAction = useCallback((action: ModalAction, user: AdminUser) => {
    setSelectedUser(user);
    setModalAction(action);
    setActionReason("");
    setResultBanner(null);
    setErrorBanner(null);
  }, []);

  // Execute action
  const executeAction = useCallback(async () => {
    if (!modalAction || !selectedUser) return;
    setActionLoading(true);
    setErrorBanner(null);

    try {
      if (modalAction === "suspend") {
        const res = await suspendUser(selectedUser.id, actionReason);
        setResultBanner({ message: res.message });
      } else if (modalAction === "activate") {
        const res = await activateUser(selectedUser.id);
        setResultBanner({ message: res.message });
      } else if (modalAction === "resetPassword") {
        const res = await resetUserPassword(selectedUser.id);
        setResultBanner({
          message: res.message,
          tempPassword: res.temporaryPassword,
        });
      }
      setModalAction(null);
      setSelectedUser(null);
      // Refresh user list
      refetch();
    } catch (err: unknown) {
      const msg =
        (err instanceof ApiError && err.body?.error) || getErrorMessage(err) || "Une erreur est survenue.";
      setErrorBanner(msg);
      setModalAction(null);
    } finally {
      setActionLoading(false);
    }
  }, [modalAction, selectedUser, actionReason, refetch]);

  const columns = [
    {
      key: "select",
      header: (
        <button
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            toggleSelectAll();
          }}
          className="p-0.5 text-neutral-400 hover:text-brand-600 transition-colors"
          title={selectedIds.size === filteredUsers.length ? "Tout désélectionner" : "Tout sélectionner"}
        >
          {selectedIds.size === 0 ? (
            <Square className="w-4 h-4" />
          ) : selectedIds.size === filteredUsers.length ? (
            <CheckSquare className="w-4 h-4 text-brand-600" />
          ) : (
            <MinusSquare className="w-4 h-4 text-brand-600" />
          )}
        </button>
      ),
      width: "w-10",
      render: (user: AdminUser) => (
        <button
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            toggleSelect(user.id);
          }}
          className="p-0.5 text-neutral-300 hover:text-brand-600 transition-colors"
        >
          {selectedIds.has(user.id) ? (
            <CheckSquare className="w-4 h-4 text-brand-600" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      ),
    },
    {
      key: "id",
      header: "ID",
      width: "w-16",
      render: (user: AdminUser) => (
        <span className="font-mono text-neutral-500">#{user.id}</span>
      ),
    },
    {
      key: "name",
      header: t.users.user,
      render: (user: AdminUser) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-sm font-semibold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDetailUserId(user.id);
              }}
              className="font-medium text-neutral-900 hover:text-brand-600 hover:underline transition-colors text-start"
            >
              {user.name}
            </button>
            <p className="text-xs text-neutral-500">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: t.users.role,
      render: (user: AdminUser) => <RoleBadge role={user.role} />,
    },
    {
      key: "status",
      header: t.jobs.status,
      render: (user: AdminUser) => <UserStatusBadge status={user.status} />,
    },
    {
      key: "trust",
      header: t.users.trust,
      render: (user: AdminUser) => (
        <TrustBadge level={user.trustLevel} score={user.trustScore} />
      ),
    },
    {
      key: "jobs",
      header: t.users.jobsCol,
      render: (user: AdminUser) => (
        <div className="text-sm">
          <span className="font-semibold text-neutral-700">
            {user.jobsCompleted}
          </span>
          <span className="text-neutral-400"> {t.users.ended}</span>
          {user.jobsActive > 0 && (
            <span className="text-brand-600 ms-2">
              ({user.jobsActive} actifs)
            </span>
          )}
        </div>
      ),
    },
    {
      key: "financial",
      header: t.users.finances,
      render: (user: AdminUser) => (
        <span className="text-sm font-medium text-neutral-700">
          {user.role === "CLIENT"
            ? formatCurrency(user.totalSpent || 0)
            : formatCurrency(user.totalEarned || 0)}
          <span className="text-xs text-neutral-400 ms-1">
            {user.role === "CLIENT" ? t.users.spent : t.users.earned}
          </span>
        </span>
      ),
    },
    {
      key: "createdAt",
      header: t.users.registration,
      render: (user: AdminUser) => (
        <span className="text-sm text-neutral-500">
          {formatDate(user.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: t.users.actions,
      width: "w-40",
      render: (user: AdminUser) => (
        <div className="flex items-center gap-1">
          {user.status === "SUSPENDED" ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openAction("activate", user);
              }}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Réactiver"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openAction("suspend", user);
              }}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Suspendre"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              openAction("resetPassword", user);
            }}
            className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
            title="Réinitialiser le mot de passe"
          >
            <KeyRound className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Stats calculations
  const activeUsers = filteredUsers.filter((u) => u.status === "ACTIVE").length;
  const suspendedUsers = filteredUsers.filter(
    (u) => u.status === "SUSPENDED",
  ).length;
  const avgTrustScore =
    filteredUsers.length > 0
      ? Math.round(
          filteredUsers.reduce((sum, u) => sum + u.trustScore, 0) /
            filteredUsers.length,
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            {t.users.title}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            {t.users.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export Button R6 */}
          <button
            onClick={async () => {
              try {
                const { getAccessToken } =
                  await import("@/lib/api/tokenManager");
                const token = getAccessToken();
                if (!token) {
                  alert("Session expirée. Veuillez vous reconnecter.");
                  return;
                }
                const baseUrl =
                  process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? 'https://transporti-v1.onrender.com' : 'http://localhost:8000');
                const res = await fetch(`${baseUrl}/api/admin/users/export/`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "transporti_users.csv";
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch (err) {
                alert("Erreur lors de l'export CSV.");
                console.error(err);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1e293b] border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            {t.users.exportCsv}
          </button>
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

      {/* Result / Error Banners */}
      {resultBanner && (
        <ResultBanner
          message={resultBanner.message}
          tempPassword={resultBanner.tempPassword}
          onClose={() => setResultBanner(null)}
        />
      )}
      {errorBanner && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{errorBanner}</p>
          <button
            onClick={() => setErrorBanner(null)}
            className="p-1 hover:bg-red-100 rounded"
          >
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400">
            {t.users.loading}
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
          {/* Filter Bar: Role Tabs + Search (R3) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {roleTabs.map((tab) => {
                const isActive = filter === tab.value;
                const count =
                  tab.value === "ALL"
                    ? totalCount
                    : allUsers.filter((u) => u.role === tab.value).length;

                return (
                  <button
                    key={tab.value}
                    onClick={() => handleFilterChange(tab.value)}
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
                      className={`ms-2 px-1.5 py-0.5 rounded text-xs ${isActive ? "bg-white/20" : "bg-neutral-100 dark:bg-neutral-700"}`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Bar (R3) */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t.users.searchPlaceholder}
                className="w-full ps-10 pe-4 py-2.5 bg-white dark:bg-[#1e293b] border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm text-neutral-900 dark:text-neutral-200 placeholder:text-neutral-400 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute end-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-neutral-100 rounded"
                >
                  <X className="w-3.5 h-3.5 text-neutral-400" />
                </button>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {t.users.displayed}:
                </span>
                <span className="ms-2 font-semibold text-neutral-900 dark:text-white">
                  {filteredUsers.length}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {t.users.activeCount}:
                </span>
                <span className="ms-2 font-semibold text-green-600">
                  {activeUsers}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {t.users.suspended}:
                </span>
                <span className="ms-2 font-semibold text-red-600">
                  {suspendedUsers}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {t.users.avgTrust}:
                </span>
                <span className="ms-2 font-semibold text-neutral-900 dark:text-white">
                  {avgTrustScore}/100
                </span>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <DataTable
            columns={columns}
            data={filteredUsers}
            emptyMessage={
              searchQuery
                ? `Aucun utilisateur trouvé pour "${searchQuery}"`
                : "Aucun utilisateur trouvé pour ce filtre"
            }
          />

          {/* U5: Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-white dark:bg-[#1e293b] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
              </span>
              <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-700" />
              <button
                onClick={() => handleBulkAction("suspend")}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                Suspendre
              </button>
              <button
                onClick={() => handleBulkAction("activate")}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Activer
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                title="Annuler la sélection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* U1: Server-side Pagination */}
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalCount}
            pageSize={PAGE_SIZE}
          />
        </>
      )}

      {/* Action Modal */}
      <ActionModal
        action={modalAction}
        user={selectedUser}
        reason={actionReason}
        onReasonChange={setActionReason}
        onConfirm={executeAction}
        onClose={() => {
          setModalAction(null);
          setSelectedUser(null);
        }}
        loading={actionLoading}
      />

      {/* R5: User Detail Drawer */}
      <UserDetailDrawer
        userId={detailUserId}
        onClose={() => setDetailUserId(null)}
        onUserUpdated={() => fetchUsers()}
      />
    </div>
  );
}
