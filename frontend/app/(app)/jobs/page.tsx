"use client";

import { Package, Filter, Search, Plus } from "lucide-react";
import JobCard from "@/components/dashboard/JobCard";
import { useJobs } from "@/hooks/useJobs";
import LoadingState from "@/components/ui/LoadingState";
import DataSourceBadge from "@/components/ui/DataSourceBadge";

export default function JobsListPage() {
  const { data: jobs, loading, source } = useJobs();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingState variant="page" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Mes Transports
          </h1>
          <p className="text-neutral-600">
            Gérez et suivez tous vos transports
          </p>
        </div>
        <button className="bg-brand-700 hover:bg-brand-800 text-white font-semibold px-6 py-3 rounded-lg shadow-sm transition-colors flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nouveau transport
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un transport..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-brand-600 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select className="px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-brand-600 outline-none bg-white">
              <option value="">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="ACCEPTED">Accepté</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="COMPLETED">Terminé</option>
              <option value="CANCELLED">Annulé</option>
            </select>
            <button className="px-4 py-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtres
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center">
          <p className="text-2xl font-bold text-neutral-900">{jobs.length}</p>
          <p className="text-sm text-neutral-600">Total</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">
            {jobs.filter((j) => j.status === "PENDING").length}
          </p>
          <p className="text-sm text-neutral-600">En attente</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center">
          <p className="text-2xl font-bold text-accent-600">
            {jobs.filter((j) => j.status === "IN_PROGRESS").length}
          </p>
          <p className="text-sm text-neutral-600">En cours</p>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {jobs.filter((j) => j.status === "COMPLETED").length}
          </p>
          <p className="text-sm text-neutral-600">Terminés</p>
        </div>
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            Aucun transport
          </h3>
          <p className="text-neutral-600 mb-4">
            Commencez par créer votre premier transport
          </p>
          <button className="bg-brand-700 hover:bg-brand-800 text-white font-medium px-6 py-2 rounded-lg transition-colors">
            Créer un transport
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
      <DataSourceBadge source={source} />
    </div>
  );
}
