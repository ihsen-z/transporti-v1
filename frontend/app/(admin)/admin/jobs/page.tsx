"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import DataTable from "@/components/admin/DataTable";
import { JobStatusBadge } from "@/components/admin/StatusBadge";
import { useAdminJobs } from "@/hooks/useAdminData";
import { formatCurrency, formatDate, type AdminJob } from "@/lib/admin";

type StatusFilter =
  | "ALL"
  | "DRAFT"
  | "PUBLISHED"
  | "MATCHED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "PUBLISHED", label: "Publiés" },
  { value: "MATCHED", label: "Matchés" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "COMPLETED", label: "Terminés" },
  { value: "CANCELLED", label: "Annulés" },
];

export default function AdminJobsPage() {
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const { data: allJobs, source, loading, error } = useAdminJobs();

  const filteredJobs =
    filter === "ALL" ? allJobs : allJobs.filter((job) => job.status === filter);

  const columns = [
    {
      key: "id",
      header: "ID",
      width: "w-20",
      render: (job: AdminJob) => (
        <span className="font-mono text-slate-600">#{job.id}</span>
      ),
    },
    {
      key: "title",
      header: "Titre",
      render: (job: AdminJob) => (
        <div>
          <p className="font-medium text-slate-900 truncate max-w-[200px]">
            {job.title || `Job #${job.id}`}
          </p>
          <p className="text-xs text-slate-500">
            {job.cityFrom || job.pickup?.split(",")[0] || "-"} →{" "}
            {job.cityTo || job.delivery?.split(",")[0] || "-"}
          </p>
        </div>
      ),
    },
    {
      key: "clientName",
      header: "Client",
      render: (job: AdminJob) => (
        <div>
          <p className="font-medium text-slate-700">{job.clientName || "-"}</p>
          <p className="text-xs text-slate-400">{job.clientEmail || ""}</p>
        </div>
      ),
    },
    {
      key: "transporterName",
      header: "Transporteur",
      render: (job: AdminJob) =>
        job.transporterName ? (
          <div>
            <p className="font-medium text-slate-700">{job.transporterName}</p>
            <p className="text-xs text-slate-400">
              {job.transporterEmail || ""}
            </p>
          </div>
        ) : (
          <span className="text-slate-400 italic">Non assigné</span>
        ),
    },
    {
      key: "status",
      header: "Statut",
      render: (job: AdminJob) => <JobStatusBadge status={job.status} />,
    },
    {
      key: "price",
      header: "Montant",
      render: (job: AdminJob) => (
        <span className="font-semibold text-slate-900">
          {formatCurrency(job.price || 0)}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Date",
      render: (job: AdminJob) => (
        <span className="text-slate-600">{formatDate(job.created_at)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "w-12",
      render: (job: AdminJob) => (
        <Link
          href={`/jobs/${job.id}`}
          className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transports</h1>
          <p className="text-slate-500">
            Gestion et suivi de tous les jobs de la plateforme
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
          <p className="text-slate-500">Chargement des transports...</p>
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
                                            ? "bg-primary-600 text-white shadow-sm"
                                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                                        }
                                    `}
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
                <span className="text-slate-500">Total affiché:</span>
                <span className="ml-2 font-semibold text-slate-900">
                  {filteredJobs.length} jobs
                </span>
              </div>
              <div>
                <span className="text-slate-500">Valeur totale:</span>
                <span className="ml-2 font-semibold text-slate-900">
                  {formatCurrency(
                    filteredJobs.reduce((sum, j) => sum + (j.price || 0), 0),
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Jobs Table */}
          <DataTable
            columns={columns}
            data={filteredJobs}
            emptyMessage="Aucun job trouvé pour ce filtre"
          />
        </>
      )}
    </div>
  );
}
