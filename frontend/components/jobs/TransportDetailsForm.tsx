import React from "react";
import { Weight, Box } from "lucide-react";
import { PhotoUploader } from "./PhotoUploader";
import type { JobFormData } from "@/lib/types/jobs";

interface TransportDetailsFormProps {
  data: JobFormData;
  onChange: (data: Partial<JobFormData>) => void;
}

export function TransportDetailsForm({
  data,
  onChange,
}: TransportDetailsFormProps) {
  const handleChange = (field: string, value: unknown) => {
    // Parent handleFormData uses a functional update to merge correctly.
    onChange({ [field]: value } as Partial<JobFormData>);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Description des articles
        </label>
        <textarea
          value={data.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Ex: Un canapé 3 places et deux fauteuils..."
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-accent-500 min-h-[100px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            <Weight className="inline w-4 h-4 mr-1" /> Poids estimé (kg)
          </label>
          <input
            type="number"
            value={data.specifications?.weight || ""}
            onChange={(e) =>
              handleChange("specifications", { weight: e.target.value })
            }
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-accent-500"
            placeholder="Ex: 50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            <Box className="inline w-4 h-4 mr-1" /> Volume estimé (m³)
          </label>
          <input
            type="number"
            step="0.1"
            value={data.specifications?.volume || ""}
            onChange={(e) =>
              handleChange("specifications", { volume: e.target.value })
            }
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-accent-500"
            placeholder="Ex: 2.5"
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
