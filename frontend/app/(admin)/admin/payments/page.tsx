"use client";

import { useState, useMemo } from "react";
import {
  CreditCard,
  Clock,
  Lock,
  AlertTriangle,
  DollarSign,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
  Unlock,
  RotateCcw,
  X,
  ShieldCheck,
  Search,
} from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import DataTable from "@/components/admin/DataTable";
import Pagination from "@/components/admin/Pagination";
import { PaymentStatusBadge } from "@/components/admin/StatusBadge";
import { useAdminPayments, useAdminStats } from "@/hooks/useAdminData";
import { formatCurrency, formatDate, type AdminPayment } from "@/lib/admin";
import { releaseEscrow, refundEscrow } from "@/lib/services/admin";
import { useI18n } from "@/lib/i18n";

type PaymentStatusFilter = "ALL" | "HELD" | "RELEASED" | "REFUNDED" | "BLOCKED" | "PENDING";

export default function AdminPaymentsPage() {
  const {
    data: payments,
    loading: loadingPayments,
    error: errorPayments,
    source: sourcePayments,
    refetch: refetchPayments,
  } = useAdminPayments();
  const {
    data: stats,
    loading: loadingStats,
    source: sourceStats,
  } = useAdminStats();

  // Escrow action modal state
  const [escrowModal, setEscrowModal] = useState<{
    open: boolean;
    type: "release" | "refund";
    payment: AdminPayment | null;
  }>({ open: false, type: "release", payment: null });
  const [escrowReason, setEscrowReason] = useState("");
  const [escrowLoading, setEscrowLoading] = useState(false);
  const [escrowSuccess, setEscrowSuccess] = useState<string | null>(null);
  const [escrowError, setEscrowError] = useState<string | null>(null);

  // Search, filter, pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const { t } = useI18n();

  const loading = loadingPayments || loadingStats;

  // Group payments by status
  const heldPayments = payments.filter((p) => p.status === "HELD");
  const blockedPayments = payments.filter((p) => p.status === "BLOCKED");

  // Filtered + searched payments
  const filteredPayments = useMemo(() => {
    let result = [...payments];
    if (statusFilter !== "ALL") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          (p.clientName || "").toLowerCase().includes(q) ||
          (p.transporterName || "").toLowerCase().includes(q) ||
          String(p.id).includes(q) ||
          String(p.jobId).includes(q)
      );
    }
    return result;
  }, [payments, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredPayments.length / pageSize);
  const paginatedPayments = filteredPayments.slice((page - 1) * pageSize, page * pageSize);

  // Reset page when filter changes
  const handleStatusFilter = (f: PaymentStatusFilter) => {
    setStatusFilter(f);
    setPage(1);
  };

  // --- Escrow action handlers ---
  const openEscrowModal = (
    type: "release" | "refund",
    payment: AdminPayment,
  ) => {
    setEscrowModal({ open: true, type, payment });
    setEscrowReason("");
    setEscrowSuccess(null);
    setEscrowError(null);
  };

  const closeEscrowModal = () => {
    setEscrowModal({ open: false, type: "release", payment: null });
    setEscrowReason("");
    setEscrowSuccess(null);
    setEscrowError(null);
  };

  const handleEscrowAction = async () => {
    if (!escrowModal.payment || !escrowReason.trim()) return;
    setEscrowLoading(true);
    setEscrowError(null);
    try {
      const action =
        escrowModal.type === "release" ? releaseEscrow : refundEscrow;
      const result = await action(escrowModal.payment.id, escrowReason.trim());
      setEscrowSuccess(
        result.message ||
          (escrowModal.type === "release"
            ? "Escrow libéré avec succès"
            : "Escrow remboursé avec succès"),
      );
      refetchPayments();
      setTimeout(() => closeEscrowModal(), 1800);
    } catch (err: any) {
      setEscrowError(err?.message || "Une erreur est survenue");
    } finally {
      setEscrowLoading(false);
    }
  };

  const columns = [
    {
      key: "id",
      header: "ID",
      width: "w-16",
      render: (p: AdminPayment) => (
        <span className="font-mono text-neutral-500 dark:text-neutral-400">
          #{p.id}
        </span>
      ),
    },
    {
      key: "jobId",
      header: "Job",
      render: (p: AdminPayment) => (
        <span className="font-mono text-brand-600 dark:text-brand-400">
          #{p.jobId}
        </span>
      ),
    },
    {
      key: "clientName",
      header: "Client",
    },
    {
      key: "transporterName",
      header: "Transporteur",
      render: (p: AdminPayment) => (
        <span
          className={
            p.transporterName === "-"
              ? "text-neutral-400 dark:text-neutral-500"
              : ""
          }
        >
          {p.transporterName}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (p: AdminPayment) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            p.type === "ESCROW"
              ? "bg-brand-600/5 text-brand-600 dark:bg-brand-400/10 dark:text-brand-400"
              : "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
          }`}
        >
          {p.type}
        </span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      render: (p: AdminPayment) => <PaymentStatusBadge status={p.status} />,
    },
    {
      key: "amount",
      header: "Montant",
      render: (p: AdminPayment) => (
        <span className="font-semibold text-neutral-900 dark:text-white">
          {formatCurrency(p.amount)}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      render: (p: AdminPayment) => (
        <span className="text-neutral-500 dark:text-neutral-400 text-sm">
          {formatDate(p.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (p: AdminPayment) => {
        const canRelease = p.status === "HELD";
        const canRefund = p.status === "HELD" || p.status === "BLOCKED";

        if (!canRelease && !canRefund) {
          return (
            <span className="text-neutral-400 dark:text-neutral-500 text-xs">
              —
            </span>
          );
        }

        return (
          <div className="flex items-center gap-1.5">
            {canRelease && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEscrowModal("release", p);
                }}
                className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 transition-colors"
                title="Libérer l'escrow"
              >
                <Unlock className="w-4 h-4" />
              </button>
            )}
            {canRefund && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEscrowModal("refund", p);
                }}
                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors"
                title="Rembourser l'escrow"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Chargement des paiements...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (errorPayments) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-sm text-red-600">
            Erreur: {errorPayments.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Paiements
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Gestion financière et suivi des escrows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
              sourcePayments === "api"
                ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                : "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
            }`}
          >
            {sourcePayments === "api" ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            Paiements: {sourcePayments === "api" ? "API Live" : "Mock"}
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
              sourceStats === "api"
                ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                : "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
            }`}
          >
            {sourceStats === "api" ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            Stats: {sourceStats === "api" ? "API Live" : "Mock"}
          </div>
        </div>
      </div>

      {/* Success toast */}
      {escrowSuccess && (
        <div className="bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
          <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
          <p className="text-green-800 dark:text-green-300 font-medium">
            {escrowSuccess}
          </p>
        </div>
      )}

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Escrow Total"
          value={formatCurrency(stats.totalEscrow)}
          subtitle="Fonds gérés sur la plateforme"
          icon={CreditCard}
          color="primary"
        />
        <StatCard
          title="En Attente"
          value={formatCurrency(stats.pendingEscrow)}
          subtitle={`${heldPayments.length} transactions`}
          icon={Clock}
          color="warning"
        />
        <StatCard
          title="Bloqué (Litiges)"
          value={formatCurrency(stats.blockedEscrow)}
          subtitle={`${blockedPayments.length} cas en cours`}
          icon={Lock}
          color="danger"
        />
        <StatCard
          title="Revenu Plateforme"
          value={formatCurrency(stats.platformRevenue)}
          subtitle="Commission 10%"
          icon={DollarSign}
          color="accent"
        />
      </div>

      {/* Escrow Status Summary */}
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 transition-colors duration-300">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
          Répartition des Escrows
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { status: "PENDING", label: "En attente", color: "bg-orange-500" },
            { status: "HELD", label: "Retenus", color: "bg-brand-600" },
            { status: "RELEASED", label: "Libérés", color: "bg-green-500" },
            { status: "REFUNDED", label: "Remboursés", color: "bg-purple-500" },
            { status: "BLOCKED", label: "Bloqués", color: "bg-red-500" },
          ].map((item) => {
            const count = payments.filter(
              (p) => p.status === item.status,
            ).length;
            const amount = payments
              .filter((p) => p.status === item.status)
              .reduce((sum, p) => sum + p.amount, 0);

            return (
              <div
                key={item.status}
                className="text-center p-4 bg-neutral-50 dark:bg-[#0f172a] rounded-lg transition-colors duration-300"
              >
                <div
                  className={`w-3 h-3 ${item.color} rounded-full mx-auto mb-2`}
                ></div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {item.label}
                </p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                  {count}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {formatCurrency(amount)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Blocked Escrows Alert */}
      {blockedPayments.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-300">
              {blockedPayments.length} escrow(s) bloqué(s) nécessitant attention
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              Montant total bloqué:{" "}
              {formatCurrency(
                blockedPayments.reduce((s, p) => s + p.amount, 0),
              )}
            </p>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">
          Toutes les Transactions
        </h2>

        {/* Search + Status Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder={t.payments?.searchPlaceholder || "Rechercher..."}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-brand-500 transition-colors"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {([
              { key: "ALL", label: t.payments?.allStatuses || "Tous" },
              { key: "HELD", label: t.payments?.heldFilter || "En attente" },
              { key: "RELEASED", label: t.payments?.releasedFilter || "Libérés" },
              { key: "REFUNDED", label: t.payments?.refundedFilter || "Remboursés" },
              { key: "BLOCKED", label: "Bloqués" },
            ] as { key: PaymentStatusFilter; label: string }[]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === tab.key
                    ? "bg-brand-600 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                }`}
              >
                {tab.label}
                {tab.key !== "ALL" && (
                  <span className="ml-1.5 opacity-70">
                    ({payments.filter((p) => p.status === tab.key).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Summary bar */}
        <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 mb-3">
          <span>{t.payments?.displayed || "Affichées"}: {filteredPayments.length}</span>
          <span>{t.payments?.totalValue || "Valeur totale"}: {formatCurrency(filteredPayments.reduce((s, p) => s + p.amount, 0))}</span>
        </div>

        <DataTable
          columns={columns}
          data={paginatedPayments}
          emptyMessage="Aucune transaction trouvée"
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={filteredPayments.length}
              pageSize={pageSize}
            />
          </div>
        )}
      </div>

      {/* Admin Escrow Info */}
      <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-4 text-center">
        <p className="text-sm text-brand-700 dark:text-brand-300">
          <ShieldCheck className="w-4 h-4 inline mr-1" />
          Actions d&apos;escrow disponibles — Utilisez les boutons{" "}
          <Unlock className="w-3.5 h-3.5 inline text-green-600" /> (Libérer) et{" "}
          <RotateCcw className="w-3.5 h-3.5 inline text-red-600" /> (Rembourser)
          sur chaque transaction éligible
        </p>
      </div>

      {/* Escrow Action Modal */}
      {escrowModal.open && escrowModal.payment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-neutral-200 dark:border-neutral-700">
            {/* Modal Header */}
            <div
              className={`px-6 py-4 ${escrowModal.type === "release" ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {escrowModal.type === "release" ? (
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                      <Unlock className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                      <RotateCcw className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                      {escrowModal.type === "release"
                        ? "Libérer l'Escrow"
                        : "Rembourser l'Escrow"}
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Transaction #{escrowModal.payment.id} — Job #
                      {escrowModal.payment.jobId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeEscrowModal}
                  className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Transaction summary */}
              <div className="bg-neutral-50 dark:bg-[#0f172a] rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Client
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {escrowModal.payment.clientName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Transporteur
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {escrowModal.payment.transporterName}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-neutral-200 dark:border-neutral-700 pt-2 mt-2">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    Montant
                  </span>
                  <span className="font-bold text-lg text-neutral-900 dark:text-white">
                    {formatCurrency(escrowModal.payment.amount)}
                  </span>
                </div>
              </div>

              {/* Reason field */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Raison <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={escrowReason}
                  onChange={(e) => setEscrowReason(e.target.value)}
                  placeholder={
                    escrowModal.type === "release"
                      ? "Ex: Livraison confirmée par le client et le transporteur"
                      : "Ex: Annulation du job suite à litige résolu en faveur du client"
                  }
                  className="w-full px-3 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-[#0f172a] text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
                  rows={3}
                />
              </div>

              {/* Error message */}
              {escrowError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {escrowError}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-end gap-3">
              <button
                onClick={closeEscrowModal}
                disabled={escrowLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleEscrowAction}
                disabled={escrowLoading || !escrowReason.trim()}
                className={`px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  escrowModal.type === "release"
                    ? "bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-500"
                    : "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
                }`}
              >
                {escrowLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {escrowModal.type === "release"
                  ? "Confirmer la libération"
                  : "Confirmer le remboursement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
