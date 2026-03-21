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

          // Store lat/lng
          handleChange(`${target}_lat`, latitude);
          handleChange(`${target}_lng`, longitude);

          // Reverse geocode via Nominatim (free, no API key)
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`,
              { headers: { "User-Agent": "Transporti/1.0" } },
            );
            const geo = await res.json();

            if (geo.display_name) {
              handleChange(`${target}_address`, geo.display_name);
            }

            // Auto-detect governorate from response
            const state = geo.address?.state || geo.address?.county || "";
            const matchedGov = GOVERNORATES.find(
              (g) =>
                state.toLowerCase().includes(g.toLowerCase()) ||
                g.toLowerCase().includes(state.toLowerCase()),
            );
            if (matchedGov) {
              handleChange(`${target}_governorate`, matchedGov);
            }
          } catch {
            // Reverse geocoding failed — we still have lat/lng, which is fine
          }

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
    [handleChange],
  );

  /* -------------- Hint chip click -------------- */
  const addHintChip = (target: "pickup" | "dropoff", prefix: string) => {
    const field = `${target}_hint`;
    const current = data[field] || "";
    // If hint is already a complete phrase, append with separator
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
        <div className={`flex items-center justify-between mb-3`}>
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
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300"
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
              className="ml-auto text-blue-600 hover:underline"
            >
              Voir sur Maps →
            </a>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
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
              <label className="block text-xs text-gray-500 mb-1">
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
              <label className="block text-xs text-gray-500 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-blue-500" />
              Astuce de localisation
            </label>

            {/* Quick suggestion chips */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {HINT_SUGGESTIONS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => addHintChip(target, chip.prefix)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 rounded-full text-xs font-medium text-gray-600 transition-colors border border-gray-200 hover:border-blue-300"
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
                className="w-full p-2.5 pr-8 border rounded-lg text-sm focus:ring-2 focus:ring-blue-400 bg-blue-50/30"
              />
              {data[hintField] && (
                <button
                  type="button"
                  onClick={() => handleChange(hintField, "")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
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
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg flex items-start gap-3 border border-blue-200">
        <div className="mt-1 bg-white p-1.5 rounded-full text-blue-600 shadow-sm">
          <Navigation className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-semibold text-blue-900">
            Astuce de localisation
          </h4>
          <p className="text-sm text-blue-700">
            Cliquez <strong>"Ma position"</strong> pour remplir automatiquement
            via GPS. Ajoutez étage, code porte ou repère pour guider le livreur.
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
