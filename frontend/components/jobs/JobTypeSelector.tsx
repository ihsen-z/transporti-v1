"use client";

import React from "react";
import { Truck, Home } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

interface JobTypeSelectorProps {
  selectedType: string | null;
  onSelect: (type: "TRANSPORT" | "MOVING") => void;
}

export function JobTypeSelector({
  selectedType,
  onSelect,
}: JobTypeSelectorProps) {
  const { t } = useAppI18n();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Transport Option */}
      <button
        type="button"
        onClick={() => onSelect("TRANSPORT")}
        className={`p-6 border-2 rounded-xl flex flex-col items-center gap-4 transition-all
          ${
            selectedType === "TRANSPORT"
              ? "border-brand-600 bg-brand-600/5 text-brand-800"
              : "border-neutral-200 hover:border-brand-600/30 hover:bg-neutral-50"
          }`}
      >
        <div
          className={`p-4 rounded-full ${selectedType === "TRANSPORT" ? "bg-brand-600/20" : "bg-neutral-100"}`}
        >
          <Truck className="w-8 h-8" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-lg">
            {t.jobsComponents.typeSelector.transportTitle}
          </h3>
          <p className="text-sm text-neutral-500 mt-2">
            {t.jobsComponents.typeSelector.transportDesc}
          </p>
        </div>
      </button>

      {/* Moving Option */}
      <button
        type="button"
        onClick={() => onSelect("MOVING")}
        className={`p-6 border-2 rounded-xl flex flex-col items-center gap-4 transition-all
          ${
            selectedType === "MOVING"
              ? "border-brand-600 bg-brand-600/5 text-brand-800"
              : "border-neutral-200 hover:border-brand-600/30 hover:bg-neutral-50"
          }`}
      >
        <div
          className={`p-4 rounded-full ${selectedType === "MOVING" ? "bg-brand-600/20" : "bg-neutral-100"}`}
        >
          <Home className="w-8 h-8" />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-lg">{t.newJob.moving}</h3>
          <p className="text-sm text-neutral-500 mt-2">
            {t.jobsComponents.typeSelector.movingDesc}
          </p>
        </div>
      </button>
    </div>
  );
}
