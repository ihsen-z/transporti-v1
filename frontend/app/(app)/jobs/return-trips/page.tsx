"use client";

import React, { useState, useEffect } from "react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import { JobFeedCard } from "@/components/jobs/JobFeedCard";
import {
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  SortAsc,
  MapPin,
  Truck,
  TrendingDown,
} from "lucide-react";

const PAGE_SIZE = 10;

const GOVERNORATES = [
  "Tunis",
  "Ariana",
  "Ben Arous",
  "Manouba",
  "Nabeul",
  "Zaghouan",
  "Bizerte",
  "Béja",
  "Jendouba",
  "Le Kef",
  "Siliana",
  "Sousse",
  "Monastir",
  "Mahdia",
  "Sfax",
  "Kairouan",
  "Kasserine",
  "Sidi Bouzid",
  "Gabès",
  "Médenine",
  "Tataouine",
  "Gafsa",
  "Tozeur",
  "Kébili",
];

export default function ReturnTripsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useAppI18n();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">(
    "newest",
  );
  const [filters, setFilters] = useState({
    pickup_governorate: "",
    dropoff_governorate: "",
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    fetchReturnTrips();
  }, [filters, currentPage, sortBy]);

  const fetchReturnTrips = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("is_return_trip", "true");
      queryParams.append("page", String(currentPage));
      queryParams.append("page_size", String(PAGE_SIZE));

      if (filters.pickup_governorate)
        queryParams.append("pickup_governorate", filters.pickup_governorate);
      if (filters.dropoff_governorate)
        queryParams.append("dropoff_governorate", filters.dropoff_governorate);

      if (sortBy === "newest") queryParams.append("ordering", "-created_at");
      else if (sortBy === "price_asc")
        queryParams.append("ordering", "price_tnd_min");
      else if (sortBy === "price_desc")
        queryParams.append("ordering", "-price_tnd_min");

      const response = await apiClient.get<any>(
        `/api/jobs/public/?${queryParams.toString()}`,
      );

      if (response.results) {
        setJobs(response.results);
        setTotalCount(response.count || response.results.length);
      } else if (Array.isArray(response)) {
        const start = (currentPage - 1) * PAGE_SIZE;
        setJobs(response.slice(start, start + PAGE_SIZE));
        setTotalCount(response.length);
      } else {
        setJobs([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error("Error fetching return trips:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading)
    return <div className="p-8 text-center">{t.common.loading}</div>;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">
                {t.returnTrips.title}
              </h1>
              <p className="text-sm text-neutral-500">
                {t.returnTrips.subtitle}
              </p>
            </div>
          </div>

          {/* Value proposition banner */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-4 mt-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-purple-700">
                <TrendingDown className="w-4 h-4" />
                <span className="font-medium">{t.returnTrips.discount}</span>
              </div>
              <div className="flex items-center gap-2 text-purple-700">
                <Truck className="w-4 h-4" />
                <span>{t.returnTrips.verified}</span>
              </div>
              <div className="flex items-center gap-2 text-purple-700">
                <MapPin className="w-4 h-4" />
                <span>{t.returnTrips.allTunisia}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="w-full md:w-64 flex-shrink-0 animate-fade-in-up delay-100">
            <div className="bg-white rounded-xl border border-neutral-200 p-5 sticky top-20">
              <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Search className="w-4 h-4" />
                {t.returnTrips.filter}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    {t.returnTrips.departure}
                  </label>
                  <select
                    value={filters.pickup_governorate}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        pickup_governorate: e.target.value,
                      }))
                    }
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                  >
                    <option value="">{t.returnTrips.allGovernorates}</option>
                    {GOVERNORATES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    {t.returnTrips.destination}
                  </label>
                  <select
                    value={filters.dropoff_governorate}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        dropoff_governorate: e.target.value,
                      }))
                    }
                    className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
                  >
                    <option value="">{t.returnTrips.allGovernorates}</option>
                    {GOVERNORATES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                {(filters.pickup_governorate ||
                  filters.dropoff_governorate) && (
                  <button
                    onClick={() =>
                      setFilters({
                        pickup_governorate: "",
                        dropoff_governorate: "",
                      })
                    }
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors"
                  >
                    {t.returnTrips.resetFilters}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Feed */}
          <div className="flex-1 animate-fade-in-up delay-200">
            <div className="mb-6 flex justify-between items-center">
              <span className="text-sm text-neutral-500">
                {totalCount}{" "}
                {totalCount > 1
                  ? t.returnTrips.countPlural
                  : t.returnTrips.count}
              </span>
              <div className="flex items-center gap-2">
                <SortAsc className="w-4 h-4 text-neutral-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "newest" | "price_asc" | "price_desc")}
                  className="text-sm border border-neutral-200 rounded-lg px-3 py-2 bg-white text-neutral-700 focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="newest">{t.returnTrips.sortNewest}</option>
                  <option value="price_asc">
                    {t.returnTrips.sortPriceAsc}
                  </option>
                  <option value="price_desc">
                    {t.returnTrips.sortPriceDesc}
                  </option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-48 bg-neutral-200 rounded-xl skeleton"
                  />
                ))}
              </div>
            ) : jobs.length > 0 ? (
              <>
                <div className="space-y-4">
                  {jobs.map((job, index) => (
                    <div
                      key={job.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <JobFeedCard job={job} />
                    </div>
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
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2)
                        pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                            currentPage === pageNum
                              ? "bg-purple-600 text-white shadow-sm"
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
              <div className="bg-white rounded-xl p-12 text-center border animate-fade-in-up">
                <div className="mx-auto w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                  <RotateCcw className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                  {t.returnTrips.noTrips}
                </h3>
                <p className="text-neutral-500 max-w-md mx-auto">
                  {t.returnTrips.noTripsDesc}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
