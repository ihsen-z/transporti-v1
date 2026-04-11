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

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface MovingDetailsFormProps {
  data: any;
  onChange: (data: any) => void;
}

const ROOM_OPTIONS = [
  { value: "studio", label: "Studio / S+0" },
  { value: "1", label: "S+1 — 1 pièce" },
  { value: "2", label: "S+2 — 2 pièces" },
  { value: "3", label: "S+3 — 3 pièces" },
  { value: "4", label: "S+4 — 4 pièces" },
  { value: "5+", label: "Villa / Grand appartement" },
  { value: "office", label: "Bureau / Local commercial" },
];

const ELEVATOR_OPTIONS = [
  { value: "yes", label: "Oui" },
  { value: "no", label: "Non" },
  { value: "small", label: "Oui mais trop petit pour meubles" },
];

const HELPER_OPTIONS = [1, 2, 3, 4];

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function MovingDetailsForm({ data, onChange }: MovingDetailsFormProps) {
  const specs = data.specifications || {};

  const update = (field: string, value: any) => {
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
          Logement & Volume
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Room count */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Nombre de pièces
            </label>
            <select
              value={specs.room_count || ""}
              onChange={(e) => update("room_count", e.target.value)}
              className="w-full p-3 border border-neutral-300 rounded-xl bg-white focus:ring-2 focus:ring-accent-500 focus:border-brand-600 transition-colors"
            >
              <option value="">— Sélectionner —</option>
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
              Volume estimé (m³)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={specs.volume || ""}
              onChange={(e) => update("volume", e.target.value)}
              placeholder="Ex: 15"
              className="w-full p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-brand-600 transition-colors"
            />
            <p className="text-xs text-neutral-400 mt-1">
              Astuce : un studio ≈ 10 m³, un S+2 ≈ 25-35 m³
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
          Accès — Départ & Arrivée
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Departure */}
          <div className="space-y-3 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
            <p className="text-sm font-semibold text-neutral-700">📤 Départ</p>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Étage
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={specs.floor_departure ?? ""}
                onChange={(e) =>
                  update("floor_departure", parseInt(e.target.value) || 0)
                }
                placeholder="0 pour RDC"
                className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Ascenseur
              </label>
              <select
                value={specs.elevator_departure || ""}
                onChange={(e) => update("elevator_departure", e.target.value)}
                className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-accent-500"
              >
                <option value="">— Sélectionner —</option>
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
            <p className="text-sm font-semibold text-neutral-700">📥 Arrivée</p>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Étage
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={specs.floor_arrival ?? ""}
                onChange={(e) =>
                  update("floor_arrival", parseInt(e.target.value) || 0)
                }
                placeholder="0 pour RDC"
                className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Ascenseur
              </label>
              <select
                value={specs.elevator_arrival || ""}
                onChange={(e) => update("elevator_arrival", e.target.value)}
                className="w-full p-2.5 border border-neutral-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-accent-500"
              >
                <option value="">— Sélectionner —</option>
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
          Services demandés
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              {
                key: "needs_disassembly",
                label: "Démontage / remontage meubles",
                icon: Wrench,
              },
              {
                key: "needs_packing",
                label: "Emballage par le transporteur",
                icon: Package,
              },
              {
                key: "has_fragile",
                label: "Articles fragiles à protéger",
                icon: ShieldAlert,
              },
              {
                key: "packing_materials_provided",
                label: "Matériaux d'emballage fournis",
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
            Manutentionnaires souhaités
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
            Nombre d&apos;aides pour le chargement / déchargement
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
            Détails articles fragiles
          </h3>
          <textarea
            value={specs.fragile_description || ""}
            onChange={(e) => update("fragile_description", e.target.value)}
            placeholder="Ex: Miroir ancien 1.5m × 1m, vaisselle fine (3 cartons), écran TV 55 pouces..."
            className="w-full p-3 border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-400 min-h-[80px] text-sm"
          />
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/*  Section 5: Description & Instructions                             */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <h3 className="text-base font-semibold text-neutral-800 mb-3">
          Description & instructions spéciales
        </h3>
        <textarea
          value={data.description || ""}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Décrivez votre déménagement : mobilier principal, contraintes d'accès, horaires préférés..."
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
