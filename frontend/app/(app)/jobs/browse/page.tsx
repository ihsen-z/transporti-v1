"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import { JobFilters } from "@/components/jobs/JobFilters";
import { JobFeedCard } from "@/components/jobs/JobFeedCard";
import { Search, MapPin } from "lucide-react";

export default function JobBrowsePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    job_type: "",
    pickup_governorate: "",
    dropoff_governorate: "",
  });

  useEffect(() => {
    fetchJobs();
  }, [filters]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.job_type) queryParams.append("job_type", filters.job_type);
      if (filters.pickup_governorate)
        queryParams.append("pickup_governorate", filters.pickup_governorate);
      if (filters.dropoff_governorate)
        queryParams.append("dropoff_governorate", filters.dropoff_governorate);

      const response = await apiClient.get<any>(
        `/api/jobs/public/?${queryParams.toString()}`,
      );
      const jobsData =
        response.results ?? (Array.isArray(response) ? response : []);
      setJobs(jobsData);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="p-8 text-center">Chargement...</div>;

  if (user?.role?.toUpperCase() !== "TRANSPORTER") {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600">Accès Refusé</h2>
        <p className="text-neutral-600">
          Seuls les transporteurs peuvent accéder à cette page.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="w-full md:w-64 flex-shrink-0">
            <JobFilters filters={filters} onChange={setFilters} />
          </div>

          {/* Main Feed */}
          <div className="flex-1">
            <div className="mb-6 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-neutral-900">
                Missions disponibles
              </h1>
              <span className="bg-brand-600/10 text-brand-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                {jobs.length} résultats
              </span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-48 bg-neutral-200 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : jobs.length > 0 ? (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <JobFeedCard key={job.id} job={job} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-12 text-center border">
                <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-neutral-400" />
                </div>
                <h3 className="text-lg font-medium text-neutral-900">
                  Aucune mission trouvée
                </h3>
                <p className="text-neutral-500 mt-1">
                  Essayez de modifier vos filtres ou revenez plus tard.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
