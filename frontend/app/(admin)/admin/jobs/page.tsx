"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MessageSquare,
} from "lucide-react";
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

type SortKey = "id" | "price" | "created_at" | "status";
type SortDir = "asc" | "desc";

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Tous" },
  { value: "PUBLISHED", label: "Publiés" },
  { value: "MATCHED", label: "Matchés" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "COMPLETED", label: "Terminés" },
  { value: "CANCELLED", label: "Annulés" },
];

export default function AdminJobsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const { data: allJobs, loading, error } = useAdminJobs();

  /* ---- Sort handler ---- */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  /* ---- Sort icon component ---- */
  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-neutral-300 ml-1" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-brand-600 ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-brand-600 ml-1" />
    );
  };

  /* ---- Filtered + Sorted jobs ---- */
  const filteredJobs = useMemo(() => {
    let jobs =
      filter === "ALL"
        ? allJobs
        : allJobs.filter((job) => job.status === filter);

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      jobs = jobs.filter(
        (job) =>
          (job.title || "").toLowerCase().includes(q) ||
          (job.clientName || "").toLowerCase().includes(q) ||
          (job.transporterName || "").toLowerCase().includes(q) ||
          (job.clientEmail || "").toLowerCase().includes(q) ||
          (job.cityFrom || "").toLowerCase().includes(q) ||
          (job.cityTo || "").toLowerCase().includes(q) ||
          String(job.id).includes(q),
      );
    }

    // Sort
    jobs = [...jobs].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "id":
          cmp = a.id - b.id;
          break;
        case "price":
          cmp = (a.price || 0) - (b.price || 0);
          break;
        case "created_at":
          cmp =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "status":
          cmp = (a.status || "").localeCompare(b.status || "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return jobs;
  }, [allJobs, filter, searchQuery, sortKey, sortDir]);

  /* ---- Navigate to job detail ---- */
  const handleRowClick = (job: AdminJob) => {
    router.push(`/admin/jobs/${job.id}`);
  };

  /* ---- Column definitions ---- */
  const columns = [
    {
      key: "id",
      header: "ID",
      width: "w-16",
      render: (job: AdminJob) => (
        <span className="font-mono text-neutral-500 text-xs">#{job.id}</span>
      ),
    },
    {
      key: "title",
      header: "Titre",
      render: (job: AdminJob) => (
        <div>
          <p className="font-medium text-neutral-900 truncate max-w-[220px]">
            {job.title || `Job #${job.id}`}
          </p>
          <p className="text-xs text-neutral-500">
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
          <p className="font-medium text-neutral-700">
            {job.clientName || "-"}
          </p>
          <p className="text-xs text-neutral-400">{job.clientEmail || ""}</p>
        </div>
      ),
    },
    {
      key: "transporterName",
      header: "Transporteur",
      render: (job: AdminJob) =>
        job.transporterName ? (
          <div>
            <p className="font-medium text-neutral-700">
              {job.transporterName}
            </p>
            <p className="text-xs text-neutral-400">
              {job.transporterEmail || ""}
            </p>
          </div>
        ) : (
          <span className="text-neutral-400 italic text-sm">Non assigné</span>
        ),
    },
    {
      key: "status",
      header: (
        <button
          onClick={() => handleSort("status")}
          className="flex items-center cursor-pointer hover:text-brand-600 transition-colors"
        >
          Statut <SortIcon colKey="status" />
        </button>
      ),
      render: (job: AdminJob) => <JobStatusBadge status={job.status} />,
    },
    {
      key: "offersCount",
      header: "Offres",
      width: "w-20",
      render: (job: AdminJob) => {
        const count = (job as any).offersCount ?? 0;
        return (
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
            <span
              className={`font-medium text-sm ${count > 0 ? "text-brand-600" : "text-neutral-400"}`}
            >
              {count}
            </span>
          </div>
        );
      },
    },
    {
      key: "price",
      header: (
        <button
          onClick={() => handleSort("price")}
          className="flex items-center cursor-pointer hover:text-brand-600 transition-colors"
        >
          Montant <SortIcon colKey="price" />
        </button>
      ),
      render: (job: AdminJob) => (
        <span className="font-semibold text-neutral-900">
          {formatCurrency(job.price || 0)}
        </span>
      ),
    },
    {
      key: "created_at",
      header: (
        <button
          onClick={() => handleSort("created_at")}
          className="flex items-center cursor-pointer hover:text-brand-600 transition-colors"
        >
          Date <SortIcon colKey="created_at" />
        </button>
      ),
      render: (job: AdminJob) => (
        <span className="text-neutral-600 text-sm">
          {formatDate(job.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "w-12",
      render: (job: AdminJob) => (
        <Link
          href={`/admin/jobs/${job.id}`}
          className="p-2 text-neutral-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors inline-flex"
          onClick={(e) => e.stopPropagation()}
        >
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Transports</h1>
        <p className="text-neutral-500">
          Gestion et suivi de tous les jobs de la plateforme
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4" />
          <p className="text-neutral-500">Chargement des transports...</p>
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
          {/* Controls: Status Tabs + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par titre, client, transporteur..."
                className="pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 w-full sm:w-80"
              />
            </div>
          </div>

          {/* Stats Bar */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-neutral-500">Total affiché:</span>
                <span className="ml-2 font-semibold text-neutral-900">
                  {filteredJobs.length} jobs
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Valeur totale:</span>
                <span className="ml-2 font-semibold text-neutral-900">
                  {formatCurrency(
                    filteredJobs.reduce((sum, j) => sum + (j.price || 0), 0),
                  )}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Offres total:</span>
                <span className="ml-2 font-semibold text-brand-600">
                  {filteredJobs.reduce(
                    (sum, j) => sum + ((j as any).offersCount || 0),
                    0,
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Jobs Table */}
          <DataTable
            columns={columns}
            data={filteredJobs}
            onRowClick={handleRowClick}
            emptyMessage="Aucun job trouvé pour ce filtre"
          />
        </>
      )}
    </div>
  );
}
