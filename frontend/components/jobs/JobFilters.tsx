"use client";

import React from "react";
import { Filter, MapPin, Truck, Home } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

export interface JobFiltersValue {
  job_type: string;
  pickup_governorate: string;
  dropoff_governorate: string;
}

interface JobFiltersProps {
  filters: JobFiltersValue;
  onChange: (filters: JobFiltersValue) => void;
}

export function JobFilters({ filters, onChange }: JobFiltersProps) {
  const { t } = useAppI18n();
  const handleChange = (field: keyof JobFiltersValue, value: string) => {
    onChange({ ...filters, [field]: value });
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
      <div className="flex items-center gap-2 mb-4 text-neutral-900 font-semibold">
        <Filter className="w-5 h-5" />
        <h3>{t.jobsComponents.filters.title}</h3>
      </div>

      <div className="space-y-6">
        {/* Type of Service */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            {t.jobsComponents.filters.serviceType}
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="job_type"
                checked={filters.job_type === ""}
                onChange={() => handleChange("job_type", "")}
                className="text-brand-600"
              />
              <span className="text-sm">{t.jobsComponents.filters.all}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="job_type"
                checked={filters.job_type === "TRANSPORT"}
                onChange={() => handleChange("job_type", "TRANSPORT")}
                className="text-brand-600"
              />
              <Truck className="w-4 h-4 text-neutral-500" />
              <span className="text-sm">
                {t.jobsComponents.filters.transport}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="job_type"
                checked={filters.job_type === "MOVING"}
                onChange={() => handleChange("job_type", "MOVING")}
                className="text-brand-600"
              />
              <Home className="w-4 h-4 text-neutral-500" />
              <span className="text-sm">{t.newJob.moving}</span>
            </label>
          </div>
        </div>

        {/* Location (Governorate) */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            <MapPin className="inline w-4 h-4 me-1" />
            {t.jobsComponents.filters.pickupGov}
          </label>
          <select
            value={filters.pickup_governorate || ""}
            onChange={(e) => handleChange("pickup_governorate", e.target.value)}
            className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent-500"
          >
            <option value="">{t.jobsComponents.filters.all}</option>
            <option value="Tunis">Tunis</option>
            <option value="Ariana">Ariana</option>
            <option value="Ben Arous">Ben Arous</option>
            <option value="Manouba">Manouba</option>
            <option value="Sfax">Sfax</option>
            <option value="Sousse">Sousse</option>
            <option value="Monastir">Monastir</option>
            <option value="Nabeul">Nabeul</option>
            {/* Add others as needed */}
          </select>
        </div>

        {/* Budget Range */}
        {/* Placeholder for budget range slider later */}
      </div>
    </div>
  );
}
