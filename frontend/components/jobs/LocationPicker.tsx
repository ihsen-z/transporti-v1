"use client";

import React, { useState, useCallback } from "react";
import {
  MapPin,
  Navigation,
  Crosshair,
  Loader2,
  Building,
  DoorOpen,
  Landmark,
  Eye,
  ArrowUp,
  X,
} from "lucide-react";

/* -------------- Governorate list (Tunisia) -------------- */
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
  "Kef",
  "Siliana",
  "Sousse",
  "Monastir",
  "Mahdia",
  "Sfax",
  "Kairouan",
  "Kasserine",
  "Sidi Bouzid",
  "Gabès",
  "Medenine",
  "Tataouine",
  "Gafsa",
  "Tozeur",
  "Kebili",
];

/* -------------- Hint suggestion chips -------------- */
const HINT_SUGGESTIONS = [
  {
    icon: <Building className="w-3.5 h-3.5" />,
    label: "Étage",
    prefix: "Étage ",
  },
  {
    icon: <DoorOpen className="w-3.5 h-3.5" />,
    label: "Code porte",
    prefix: "Code porte: ",
  },
  {
    icon: <ArrowUp className="w-3.5 h-3.5" />,
    label: "Ascenseur",
    prefix: "Ascenseur disponible",
  },
  {
    icon: <Eye className="w-3.5 h-3.5" />,
    label: "Repère visuel",
    prefix: "En face de ",
  },
  {
    icon: <Landmark className="w-3.5 h-3.5" />,
    label: "Point de repère",
    prefix: "Près de ",
  },
];

interface LocationPickerProps {
  data: any;
  onChange: (data: any) => void;
}

interface GpsState {
  loading: boolean;
  error: string | null;
  done: boolean;
}

export function LocationPicker({ data, onChange }: LocationPickerProps) {
  const [pickupGps, setPickupGps] = useState<GpsState>({
    loading: false,
    error: null,
    done: !!data.pickup_lat,
  });
  const [dropoffGps, setDropoffGps] = useState<GpsState>({
    loading: false,
    error: null,
    done: !!data.dropoff_lat,
  });

  const handleChange = (field: string, value: any) => {
    onChange({ [field]: value });
  };

  /* -------------- GPS geolocation -------------- */
  const getGpsPosition = useCallback(
    (target: "pickup" | "dropoff") => {
      const setGps = target === "pickup" ? setPickupGps : setDropoffGps;

      if (!navigator.geolocation) {
        setGps({
          loading: false,
          error: "Géolocalisation non supportée par ce navigateur.",
          done: false,
        });
        return;
      }

      setGps({ loading: true, error: null, done: false });

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Build a SINGLE update object with ALL GPS data
          const updates: Record<string, any> = {
            [`${target}_lat`]: latitude,
            [`${target}_lng`]: longitude,
          };

          // Reverse geocode via Nominatim (free, no API key)
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`,
              { headers: { "User-Agent": "Transporti/1.0" } },
            );
            const geo = await res.json();

            if (geo.display_name) {
              updates[`${target}_address`] = geo.display_name;
            }

            // Auto-detect governorate from response
            const state = geo.address?.state || geo.address?.county || "";
            const matchedGov = GOVERNORATES.find(
              (g) =>
                state.toLowerCase().includes(g.toLowerCase()) ||
                g.toLowerCase().includes(state.toLowerCase()),
            );
            if (matchedGov) {
              updates[`${target}_governorate`] = matchedGov;
            }
          } catch {
            // Reverse geocoding failed — we still have lat/lng, which is fine
          }

          // Send ALL updates in ONE call — prevents state race conditions
          onChange(updates);
          setGps({ loading: false, error: null, done: true });
        },
        (err) => {
          let msg = "Erreur de géolocalisation.";
          if (err.code === 1)
            msg = "Accès à la position refusé. Autorisez la géolocalisation.";
          if (err.code === 2) msg = "Position non disponible.";
          if (err.code === 3) msg = "Délai d'attente dépassé.";
          setGps({ loading: false, error: msg, done: false });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    },
    [onChange],
  );

  /* -------------- Hint chip click -------------- */
  const addHintChip = (target: "pickup" | "dropoff", prefix: string) => {
    const field = `${target}_hint`;
    const current = data[field] || "";
    const separator = current ? " • " : "";
    handleChange(field, current + separator + prefix);
  };

  /* -------------- Render a location section -------------- */
  const renderLocationSection = (
    target: "pickup" | "dropoff",
    title: string,
    color: string,
    gpsState: GpsState,
  ) => {
    const addressField = `${target}_address`;
    const govField = `${target}_governorate`;
    const postalField = `${target}_postal_code`;
    const hintField = `${target}_hint`;
    const latField = `${target}_lat`;
    const lngField = `${target}_lng`;

    return (
      <div className="border rounded-xl p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div
            className={`flex items-center gap-2 text-${color}-600 font-semibold`}
          >
            <MapPin className="w-5 h-5" />
            <h3>{title}</h3>
          </div>

          {/* GPS Button */}
          <button
            type="button"
            onClick={() => getGpsPosition(target)}
            disabled={gpsState.loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                            ${
                              gpsState.done
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                                : "bg-brand-600/10 text-brand-600 hover:bg-brand-600/20 border border-brand-600/30"
                            }
                            disabled:opacity-50 disabled:cursor-wait`}
          >
            {gpsState.loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : gpsState.done ? (
              <Crosshair className="w-4 h-4" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            {gpsState.loading
              ? "Localisation..."
              : gpsState.done
                ? "GPS ✓"
                : "Ma position"}
          </button>
        </div>

        {/* GPS error */}
        {gpsState.error && (
          <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg mb-3">
            {gpsState.error}
          </p>
        )}

        {/* GPS coords display */}
        {data[latField] && data[lngField] && (
          <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg mb-3 flex items-center gap-2">
            <Crosshair className="w-3.5 h-3.5" />
            <span>
              📍 {Number(data[latField]).toFixed(5)},{" "}
              {Number(data[lngField]).toFixed(5)}
            </span>
            <a
              href={`https://www.google.com/maps?q=${data[latField]},${data[lngField]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-brand-600 hover:underline"
            >
              Voir sur Maps →
            </a>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-neutral-600 mb-1">
              Adresse complète
            </label>
            <input
              type="text"
              value={data[addressField] || ""}
              onChange={(e) => handleChange(addressField, e.target.value)}
              placeholder={
                target === "pickup"
                  ? "Ex: 12 Rue de la République, Tunis"
                  : "Ex: Zone Industrielle, Sfax"
              }
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-${color}-500`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">
                Gouvernorat
              </label>
              <select
                value={data[govField] || ""}
                onChange={(e) => handleChange(govField, e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
              >
                <option value="">Choisir...</option>
                {GOVERNORATES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">
                Code Postal
              </label>
              <input
                type="text"
                value={data[postalField] || ""}
                onChange={(e) => handleChange(postalField, e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
                placeholder={target === "pickup" ? "Ex: 1001" : "Ex: 3000"}
              />
            </div>
          </div>

          {/* ========== ASTUCE DE LOCALISATION ========== */}
          <div className="border-t pt-3 mt-1">
            <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-brand-600" />
              Astuce de localisation
            </label>

            {/* Quick suggestion chips */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {HINT_SUGGESTIONS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => addHintChip(target, chip.prefix)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-100 hover:bg-brand-600/10 hover:text-brand-600 rounded-full text-xs font-medium text-neutral-600 transition-colors border border-neutral-200 hover:border-brand-600/30"
                >
                  {chip.icon}
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Free-text hint input */}
            <div className="relative">
              <input
                type="text"
                value={data[hintField] || ""}
                onChange={(e) => handleChange(hintField, e.target.value)}
                placeholder="Ex: 3ème étage, code porte 4589, en face de la boulangerie"
                className="w-full p-2.5 pr-8 border rounded-lg text-sm focus:ring-2 focus:ring-accent-500 bg-brand-600/5/30"
              />
              {data[hintField] && (
                <button
                  type="button"
                  onClick={() => handleChange(hintField, "")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Info banner — now interactive */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-50 p-4 rounded-lg flex items-start gap-3 border border-brand-600/20">
        <div className="mt-1 bg-white p-1.5 rounded-full text-brand-600 shadow-sm">
          <Navigation className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-semibold text-brand-800">
            Astuce de localisation
          </h4>
          <p className="text-sm text-brand-600">
            Cliquez <strong>&quot;Ma position&quot;</strong> pour remplir
            automatiquement via GPS. Ajoutez étage, code porte ou repère pour
            guider le livreur.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {renderLocationSection(
          "pickup",
          "Point de Départ",
          "orange",
          pickupGps,
        )}
        {renderLocationSection("dropoff", "Destination", "green", dropoffGps)}
      </div>
    </div>
  );
}
