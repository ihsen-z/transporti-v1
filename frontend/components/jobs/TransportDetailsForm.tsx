"use client";

import React from "react";
import { Weight, Box } from "lucide-react";
import { PhotoUploader } from "./PhotoUploader";
import type { JobFormData } from "@/lib/types/jobs";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

interface TransportDetailsFormProps {
  data: JobFormData;
  onChange: (data: Partial<JobFormData>) => void;
}

export function TransportDetailsForm({
  data,
  onChange,
}: TransportDetailsFormProps) {
  const { t } = useAppI18n();
  const handleChange = (field: string, value: unknown) => {
    // Parent handleFormData uses a functional update to merge correctly.
    onChange({ [field]: value } as Partial<JobFormData>);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          {t.jobsComponents.transportForm.itemsDesc}
        </label>
        <textarea
          value={data.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder={t.jobsComponents.transportForm.itemsPlaceholder}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-accent-500 min-h-[100px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            <Weight className="inline w-4 h-4 me-1" />{" "}
            {t.jobsComponents.transportForm.weightLabel}
          </label>
          <input
            type="number"
            value={data.specifications?.weight || ""}
            onChange={(e) =>
              handleChange("specifications", { weight: e.target.value })
            }
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-accent-500"
            placeholder={t.jobsComponents.transportForm.weightPlaceholder}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            <Box className="inline w-4 h-4 me-1" />{" "}
            {t.jobsComponents.transportForm.volumeLabel}
          </label>
          <input
            type="number"
            step="0.1"
            value={data.specifications?.volume || ""}
            onChange={(e) =>
              handleChange("specifications", { volume: e.target.value })
            }
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-accent-500"
            placeholder={t.jobsComponents.transportForm.volumePlaceholder}
          />
        </div>
      </div>

      {/* Photo upload — camera + gallery + compression + upload */}
      <PhotoUploader
        photos={data.photos || []}
        onPhotosChange={(photos) => handleChange("photos", photos)}
        maxPhotos={5}
      />
    </div>
  );
}
