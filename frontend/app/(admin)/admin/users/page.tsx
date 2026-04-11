"use client";

import { useState } from "react";
import DataTable from "@/components/admin/DataTable";
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
  type AdminUser,
} from "@/lib/admin";

type RoleFilter = "ALL" | "CLIENT" | "TRANSPORTER";

const roleTabs: { value: RoleFilter; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "CLIENT", label: "Clients" },
  { value: "TRANSPORTER", label: "Transporteurs" },
];

export default function AdminUsersPage() {
  const [filter, setFilter] = useState<RoleFilter>("ALL");
  const { data: allUsers, source, loading, error } = useAdminUsers();

  const filteredUsers =
    filter === "ALL"
      ? allUsers
      : allUsers.filter((user) => user.role === filter);

  const columns = [
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
      header: "Utilisateur",
      render: (user: AdminUser) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-neutral-600">
              {user.name.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-neutral-900">{user.name}</p>
            <p className="text-xs text-neutral-500">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rôle",
      render: (user: AdminUser) => <RoleBadge role={user.role} />,
    },
    {
      key: "status",
      header: "Statut",
      render: (user: AdminUser) => <UserStatusBadge status={user.status} />,
    },
    {
      key: "trust",
      header: "Confiance",
      render: (user: AdminUser) => (
        <TrustBadge level={user.trustLevel} score={user.trustScore} />
      ),
    },
    {
      key: "jobs",
      header: "Jobs",
      render: (user: AdminUser) => (
        <div className="text-sm">
          <span className="font-semibold text-neutral-700">
            {user.jobsCompleted}
          </span>
          <span className="text-neutral-400"> terminés</span>
          {user.jobsActive > 0 && (
            <span className="text-brand-600 ml-2">
              ({user.jobsActive} actifs)
            </span>
          )}
        </div>
      ),
    },
    {
      key: "financial",
      header: "Finances",
      render: (user: AdminUser) => (
        <span className="text-sm font-medium text-neutral-700">
          {user.role === "CLIENT"
            ? formatCurrency(user.totalSpent || 0)
            : formatCurrency(user.totalEarned || 0)}
          <span className="text-xs text-neutral-400 ml-1">
            {user.role === "CLIENT" ? "dépensé" : "gagné"}
          </span>
        </span>
      ),
    },
    {
      key: "lastSeenAt",
      header: "Dernière activité",
      render: (user: AdminUser) => (
        <span className="text-sm text-neutral-500">
          {user.lastSeenAt ? formatTimeAgoShort(user.lastSeenAt) : "-"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Inscription",
      render: (user: AdminUser) => (
        <span className="text-sm text-neutral-500">
          {formatDate(user.createdAt)}
        </span>
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
          <h1 className="text-2xl font-bold text-neutral-900">Utilisateurs</h1>
          <p className="text-neutral-500">
            Gestion des clients et transporteurs de la plateforme
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
        <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-neutral-500">Chargement des utilisateurs...</p>
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
          {/* Role Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {roleTabs.map((tab) => {
              const isActive = filter === tab.value;
              const count =
                tab.value === "ALL"
                  ? allUsers.length
                  : allUsers.filter((u) => u.role === tab.value).length;

              return (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`
                                        px-4 py-2 rounded-lg text-sm font-medium transition-all
                                        ${
                                          isActive
                                            ? "bg-brand-600 text-white shadow-sm"
                                            : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
                                        }
                                    `}
                >
                  {tab.label}
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded text-xs ${isActive ? "bg-white/20" : "bg-neutral-100"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Stats Bar */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-neutral-500">Affichés:</span>
                <span className="ml-2 font-semibold text-neutral-900">
                  {filteredUsers.length}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Actifs:</span>
                <span className="ml-2 font-semibold text-green-600">
                  {activeUsers}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Suspendus:</span>
                <span className="ml-2 font-semibold text-red-600">
                  {suspendedUsers}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Score confiance moyen:</span>
                <span className="ml-2 font-semibold text-neutral-900">
                  {avgTrustScore}/100
                </span>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <DataTable
            columns={columns}
            data={filteredUsers}
            emptyMessage="Aucun utilisateur trouvé pour ce filtre"
          />
        </>
      )}
    </div>
  );
}
