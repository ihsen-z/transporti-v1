"use client";

import React from "react";
import {
  Home,
  ArrowUpDown,
  Users,
  Package,
  ShieldAlert,
  Wrench,
  Box,
} from "lucide-react";
import { PhotoUploader } from "./PhotoUploader";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

import type { JobFormData } from "@/lib/types/jobs";

interface MovingDetailsFormProps {
  data: JobFormData;
  onChange: (data: Partial<JobFormData>) => void;
}

const HELPER_OPTIONS = [1, 2, 3, 4];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function MovingDetailsForm({ data, onChange }: MovingDetailsFormProps) {
  const { t } = useAppI18n();
  const specs = data.specifications || {};

  const ROOM_OPTIONS = [
    { value: "studio", label: t.jobsComponents.moving.roomStudio },
    { value: "1", label: t.jobsComponents.moving.room1 },
    { value: "2", label: t.jobsComponents.moving.room2 },
    { value: "3", label: t.jobsComponents.moving.room3 },
    { value: "4", label: t.jobsComponents.moving.room4 },
    { value: "5+", label: t.jobsComponents.moving.room5 },
    { value: "office", label: t.jobsComponents.moving.roomOffice },
  ];

  const ELEVATOR_OPTIONS = [
    { value: "yes", label: t.jobsComponents.moving.elevatorYes },
    { value: "no", label: t.jobsComponents.moving.elevatorNo },
    { value: "small", label: t.jobsComponents.moving.elevatorSmall },
  ];

  const update = (field: string, value: unknown) => {
    onChange({
      specifications: { [field]: value },
    });
  };

  const handleDescriptionChange = (value: string) => {
    onChange({ description: value });
  };

  const handlePhotosChange = (photos: string[]) => {
    onChange({ photos });
  };

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/*  Section 1: Logement & Volume                                      */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <h3 className="text-base font-semibold text-neutral-800 flex items-center gap-2 mb-4">
          <Home className="w-5 h-5 text-brand-600" />
          {t.jobsComponents.moving.housingSection}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Room count */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              {t.jobsComponents.moving.roomCount}
            </label>
            <select
              value={specs.room_count || ""}
              onChange={(e) => update("room_count", e.target.value)}
              className="w-full p-3 border border-neutral-300 rounded-xl bg-white focus:ring-2 focus:ring-accent-500 focus:border-brand-600 transition-colors"
            >
              <option value="">{t.jobsComponents.moving.select}</option>
              {ROOM_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Estimated volume */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              <Box className="inline w-4 h-4 mr-1 text-neutral-500" />
              {t.jobsComponents.moving.volumeLabel}
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={specs.volume || ""}
              onChange={(e) => update("volume", e.target.value)}
              placeholder={t.jobsComponents.moving.volumePlaceholder}
              className="w-full p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-brand-600 transition-colors"
            />
            <p className="text-xs text-neutral-400 mt-1">
              {t.jobsComponents.moving.volumeHint}
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  Section 2: Accès                                                  */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <h3 className="text-base font-semibold text-neutral-800 flex items-center gap-2 mb-4">
          <ArrowUpDown className="w-5 h-5 text-purple-600" />
          {t.jobsComponents.moving.accessSection}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Departure */}
          <div className="space-y-3 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
            <p className="text-sm font-semibold text-neutral-700">
              {t.jobsComponents.moving.departure}
            </p>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                {t.jobsComponents.moving.floor}
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={specs.floor_departure ?? ""}
                onChange={(e) =>
                  update("floor_departure", parseInt(e.target.value) || 0)
                }
                placeholder={t.jobsComponents.moving.floorPlaceholder}
                className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                {t.jobsComponents.moving.elevator}
              </label>
              <select
                value={specs.elevator_departure || ""}
                onChange={(e) => update("elevator_departure", e.target.value)}
                className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-accent-500"
              >
                <option value="">{t.jobsComponents.moving.select}</option>
                {ELEVATOR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Arrival */}
          <div className="space-y-3 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
            <p className="text-sm font-semibold text-neutral-700">
              {t.jobsComponents.moving.arrival}
            </p>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                {t.jobsComponents.moving.floor}
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={specs.floor_arrival ?? ""}
                onChange={(e) =>
                  update("floor_arrival", parseInt(e.target.value) || 0)
                }
                placeholder={t.jobsComponents.moving.floorPlaceholder}
                className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                {t.jobsComponents.moving.elevator}
              </label>
              <select
                value={specs.elevator_arrival || ""}
                onChange={(e) => update("elevator_arrival", e.target.value)}
                className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-accent-500"
              >
                <option value="">{t.jobsComponents.moving.select}</option>
                {ELEVATOR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  Section 3: Services & Main-d'œuvre                                */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <h3 className="text-base font-semibold text-neutral-800 flex items-center gap-2 mb-4">
          <Wrench className="w-5 h-5 text-emerald-600" />
          {t.jobsComponents.moving.servicesSection}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              {
                key: "needs_disassembly",
                label: t.jobsComponents.moving.serviceDisassembly,
                icon: Wrench,
              },
              {
                key: "needs_packing",
                label: t.jobsComponents.moving.servicePacking,
                icon: Package,
              },
              {
                key: "has_fragile",
                label: t.jobsComponents.moving.serviceFragile,
                icon: ShieldAlert,
              },
              {
                key: "packing_materials_provided",
                label: t.jobsComponents.moving.serviceMaterials,
                icon: Box,
              },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <label
              key={key}
              className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                specs[key]
                  ? "border-brand-600 bg-brand-600/5"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <input
                type="checkbox"
                checked={!!specs[key]}
                onChange={(e) => update(key, e.target.checked)}
                className="sr-only"
              />
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${specs[key] ? "text-brand-600" : "text-neutral-400"}`}
              />
              <span
                className={`text-sm font-medium ${specs[key] ? "text-brand-600" : "text-neutral-700"}`}
              >
                {label}
              </span>
              <div
                className={`ml-auto w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  specs[key]
                    ? "bg-brand-600 border-brand-600"
                    : "border-neutral-300"
                }`}
              >
                {specs[key] && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </label>
          ))}
        </div>

        {/* Helpers count */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            <Users className="inline w-4 h-4 mr-1 text-neutral-500" />
            {t.jobsComponents.moving.helpersLabel}
          </label>
          <div className="flex gap-2">
            {HELPER_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => update("helpers_count", n)}
                className={`w-12 h-12 rounded-xl font-semibold text-base transition-all ${
                  specs.helpers_count === n
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {t.jobsComponents.moving.helpersHint}
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  Section 4: Articles fragiles                                      */}
      {/* ------------------------------------------------------------------ */}
      {specs.has_fragile && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-base font-semibold text-amber-800 flex items-center gap-2 mb-3">
            <ShieldAlert className="w-5 h-5" />
            {t.jobsComponents.moving.fragileSection}
          </h3>
          <textarea
            value={specs.fragile_description || ""}
            onChange={(e) => update("fragile_description", e.target.value)}
            placeholder={t.jobsComponents.moving.fragilePlaceholder}
            className="w-full p-3 border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-400 min-h-[80px] text-sm"
          />
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*  Section 5: Description & Instructions                             */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <h3 className="text-base font-semibold text-neutral-800 mb-3">
          {t.jobsComponents.moving.descriptionSection}
        </h3>
        <textarea
          value={data.description || ""}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder={t.jobsComponents.moving.descriptionPlaceholder}
          className="w-full p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 min-h-[100px]"
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  Section 6: Photos                                                 */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <PhotoUploader
          photos={data.photos || []}
          onPhotosChange={handlePhotosChange}
          maxPhotos={5}
        />
      </section>
    </div>
  );
}
