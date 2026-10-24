"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { searchPublicJobs } from "@/lib/services/search";
import { JobFilters } from "@/components/jobs/JobFilters";
import { JobFeedCard } from "@/components/jobs/JobFeedCard";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  SortAsc,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

const PAGE_SIZE = 10;

export default function JobBrowsePage() {
  const { t } = useAppI18n();
  const { user, isLoading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  // Identifie la requête la plus récente pour ignorer les réponses obsolètes
  // (changement de filtre rapide sur connexion lente).
  const fetchIdRef = useRef(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">(
    "newest",
  );
  const [filters, setFilters] = useState({
    job_type: "",
    pickup_governorate: "",
    dropoff_governorate: "",
  });

  useEffect(() => {
    setCurrentPage(1); // Reset page when filters change
  }, [filters]);

  useEffect(() => {
    fetchJobs();
  }, [filters, currentPage, sortBy]);

  const fetchJobs = async () => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setFetchError(false);
    try {
      // Pas de filtre is_return_trip : cet ecran montre les DEUX, et le
      // service ne l'ajoute que s'il est explicitement demande.
      const resultats = await searchPublicJobs({
        job_type: filters.job_type || undefined,
        pickup_governorate: filters.pickup_governorate,
        dropoff_governorate: filters.dropoff_governorate,
        page: currentPage,
        pageSize: PAGE_SIZE,
        tri: sortBy,
      });

      if (fetchId !== fetchIdRef.current) return; // reponse obsolete

      setJobs(resultats.trajets);
      setTotalCount(resultats.total);
    } catch (error) {
      if (fetchId !== fetchIdRef.current) return;
      console.error("Error fetching jobs:", error);
      setFetchError(true);
      setJobs([]);
      setTotalCount(0);
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  };

  if (authLoading)
    return <div className="p-8 text-center">{t.common.loading}</div>;

  if (user?.role?.toUpperCase() !== "TRANSPORTER") {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-error-600">
          {t.browse.accessDenied}
        </h2>
        <p className="text-neutral-600">{t.browse.transportersOnly}</p>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="px-5 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="w-full md:w-64 flex-shrink-0">
            <JobFilters filters={filters} onChange={setFilters} />
          </div>

          {/* Main Feed */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="text-[13px] font-semibold text-ink-500 tabular">
                {totalCount}{" "}
                {totalCount > 1 ? t.browse.resultsPlural : t.browse.results}
              </span>
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <SortAsc className="h-4 w-4 text-ink-300" strokeWidth={2} />
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value as "newest" | "price_asc" | "price_desc",
                    )
                  }
                  className="text-sm border border-neutral-200 rounded-lg px-3 py-2 bg-white text-neutral-700 focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="newest">{t.browse.sortNewest}</option>
                  <option value="price_asc">{t.browse.sortPriceAsc}</option>
                  <option value="price_desc">{t.browse.sortPriceDesc}</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-48 rounded-card" />
                ))}
              </div>
            ) : fetchError ? (
              <div
                role="alert"
                className="bg-surface rounded-tile p-12 text-center border border-error-200"
              >
                <div className="mx-auto w-12 h-12 bg-error-50 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-error-600" />
                </div>
                <h3 className="text-lg font-medium text-neutral-900">
                  {t.browse.errorTitle}
                </h3>
                <p className="text-neutral-500 mt-1">{t.browse.errorDesc}</p>
                <button
                  onClick={fetchJobs}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t.browse.retry}
                </button>
              </div>
            ) : jobs.length > 0 ? (
              <>
                <div className="flex flex-col gap-4">
                  {jobs.map((job) => (
                    <JobFeedCard key={job.id} job={job} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 rtl:-scale-x-100" />
                    </button>

                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                            currentPage === pageNum
                              ? "bg-brand-600 text-white shadow-sm"
                              : "border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 rtl:-scale-x-100" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-surface rounded-tile p-12 text-center border">
                <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-neutral-400" />
                </div>
                <h3 className="text-lg font-medium text-neutral-900">
                  {t.browse.noResultsTitle}
                </h3>
                <p className="text-neutral-500 mt-1">
                  {t.browse.noResultsDesc}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
