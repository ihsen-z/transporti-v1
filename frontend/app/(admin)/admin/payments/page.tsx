"use client";

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
} from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import DataTable from "@/components/admin/DataTable";
import { PaymentStatusBadge } from "@/components/admin/StatusBadge";
import { useAdminPayments, useAdminStats } from "@/hooks/useAdminData";
import { formatCurrency, formatDate, type AdminPayment } from "@/lib/admin";

export default function AdminPaymentsPage() {
  const {
    data: payments,
    loading: loadingPayments,
    error: errorPayments,
    source: sourcePayments,
  } = useAdminPayments();
  const {
    data: stats,
    loading: loadingStats,
    source: sourceStats,
  } = useAdminStats();

  const loading = loadingPayments || loadingStats;

  // Group payments by status
  const heldPayments = payments.filter((p) => p.status === "HELD");
  const blockedPayments = payments.filter((p) => p.status === "BLOCKED");
  const recentPayments = payments.slice(0, 6);

  const columns = [
    {
      key: "id",
      header: "ID",
      width: "w-16",
      render: (p: AdminPayment) => (
        <span className="font-mono text-neutral-500">#{p.id}</span>
      ),
    },
    {
      key: "jobId",
      header: "Job",
      render: (p: AdminPayment) => (
        <span className="font-mono text-brand-600">#{p.jobId}</span>
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
        <span className={p.transporterName === "-" ? "text-neutral-400" : ""}>
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
              ? "bg-brand-600/5 text-brand-600"
              : "bg-orange-50 text-orange-700"
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
        <span className="font-semibold text-neutral-900">
          {formatCurrency(p.amount)}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Date",
      render: (p: AdminPayment) => (
        <span className="text-neutral-500 text-sm">
          {formatDate(p.createdAt)}
        </span>
      ),
    },
  ];

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-sm text-neutral-500">
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
          <h1 className="text-2xl font-bold text-neutral-900">Paiements</h1>
          <p className="text-neutral-500">
            Aperçu financier et suivi des escrows (lecture seule)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
              sourcePayments === "api"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-orange-50 text-orange-700 border border-orange-200"
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
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-orange-50 text-orange-700 border border-orange-200"
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
          trend="up"
          trendValue="+8.5%"
          color="accent"
        />
      </div>

      {/* Escrow Status Summary */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-lg font-bold text-neutral-900 mb-4">
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
                className="text-center p-4 bg-neutral-50 rounded-lg"
              >
                <div
                  className={`w-3 h-3 ${item.color} rounded-full mx-auto mb-2`}
                ></div>
                <p className="text-sm font-medium text-neutral-700">
                  {item.label}
                </p>
                <p className="text-2xl font-bold text-neutral-900 mt-1">
                  {count}
                </p>
                <p className="text-xs text-neutral-500">
                  {formatCurrency(amount)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Blocked Escrows Alert */}
      {blockedPayments.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">
              {blockedPayments.length} escrow(s) bloqué(s) nécessitant attention
            </p>
            <p className="text-sm text-red-600 mt-1">
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
        <h2 className="text-lg font-bold text-neutral-900 mb-4">
          Transactions Récentes
        </h2>
        <DataTable
          columns={columns}
          data={recentPayments}
          emptyMessage="Aucune transaction trouvée"
        />
      </div>

      {/* Read-Only Notice */}
      <div className="bg-neutral-100 rounded-xl p-4 text-center">
        <p className="text-sm text-neutral-600">
          <Lock className="w-4 h-4 inline mr-1" />
          Mode lecture seule — Aucune action financière possible depuis ce
          panneau
        </p>
      </div>
    </div>
  );
}
