"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient, ApiError } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import {
  RotateCcw,
  MapPin,
  ArrowRight,
  Calendar,
  Truck,
  Package,
  Send,
  ChevronLeft,
  Loader2,
  CheckCircle,
  Info,
  Banknote,
} from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/* ------------------------------------------------------------------ */
/*  24 Gouvernorats de Tunisie                                         */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Types de véhicules tunisiens                                       */
/* ------------------------------------------------------------------ */
// VEHICLE_TYPES are now constructed inside the component using translations

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ReturnTripPage() {
  const { t: allT } = useAppI18n();
  const t = allT.returnTrip;
  
  const VEHICLE_TYPES = [
    { value: "camion", label: "🚛 Camion", desc: t.vehicleHeavy },
    { value: "camionnette", label: "🚐 Camionnette", desc: t.vehicleMedium },
    { value: "fourgon", label: "📦 Fourgon", desc: t.vehicleCovered },
    { value: "pickup", label: "🛻 Pickup", desc: t.vehicleLight },
    { value: "remorque", label: "🚜 Remorque", desc: t.vehicleSpecial },
  ];

  const router = useRouter();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    pickup_governorate: "",
    dropoff_governorate: "",
    pickup_address: "",
    dropoff_address: "",
    scheduled_time: "",
    vehicle_type: "",
    available_capacity: "",
    price_tnd_min: "",
    description: "",
  });

  const update = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
  };

  // Minimum date = 2h from now (more flexible for return trips)
  const minDate = new Date(Date.now() + 2 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  const canSubmit =
    form.pickup_governorate &&
    form.dropoff_governorate &&
    form.scheduled_time &&
    form.vehicle_type &&
    form.pickup_governorate !== form.dropoff_governorate;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        job_type: "TRANSPORT",
        pickup_address:
          form.pickup_address || `Centre ${form.pickup_governorate}`,
        pickup_governorate: form.pickup_governorate,
        dropoff_address:
          form.dropoff_address || `Centre ${form.dropoff_governorate}`,
        dropoff_governorate: form.dropoff_governorate,
        scheduled_time: new Date(form.scheduled_time).toISOString(),
        available_capacity: `${VEHICLE_TYPES.find((v) => v.value === form.vehicle_type)?.label || form.vehicle_type} — ${form.available_capacity || "Capacité non précisée"}`,
        specifications: { vehicle_type: form.vehicle_type },
        description: form.description || "",
      };

      if (form.price_tnd_min)
        payload.price_tnd_min = parseFloat(form.price_tnd_min);

      await apiClient.post("/api/jobs/return-trip/", payload);
      setSuccess(true);
      showToast(
        "success",
        t.successMsg,
      );

      // Auto-redirect after 2s
      setTimeout(() => router.push("/jobs"), 2000);
    } catch (e) {
      if (e instanceof ApiError && e.body) {
        const msg =
          typeof e.body === "object"
            ? Object.values(e.body as Record<string, string[]>)
                .flat()
                .join(", ")
            : String(e.body);
        showToast("error", msg);
      } else {
        showToast("error", t.errorPub);
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Success state                                                      */
  /* ------------------------------------------------------------------ */
  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="text-center max-w-md animate-fade-in">
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-200 to-purple-100 rounded-full animate-ping opacity-20" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center shadow-lg shadow-purple-200">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            {t.successTitle}
          </h2>
          <p className="text-neutral-500 mb-6">
            {t.successDesc}
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/jobs"
              className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all"
            >
              {t.viewMissions}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Form                                                               */
  /* ------------------------------------------------------------------ */
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 lg:py-10">
      {/* Back button */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {t.backMissions}
      </Link>

      {/* Header — distinct purple identity */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold mb-4">
          <RotateCcw className="w-4 h-4" />
          {t.badgeReturn}
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-1">
          {t.pageTitle}
        </h1>
        <p className="text-neutral-500 text-sm">
          {t.pageSubtitle}
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-200 rounded-2xl p-4 mb-8 flex gap-3">
        <Info className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-purple-700">
          <p className="font-medium mb-1">{t.howItWorksTitle}</p>
          <ol className="space-y-0.5 text-purple-600 list-decimal list-inside">
            <li>{t.howItWorks1}</li>
            <li>{t.howItWorks2}</li>
            <li>{t.howItWorks3}</li>
          </ol>
        </div>
      </div>

      {/* ============ FORM CARD ============ */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        {/* ---------- Section 1: Itinéraire ---------- */}
        <div className="p-6 border-b border-neutral-100">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-500" />
            {t.sectionRoute}
          </h3>

          <div className="flex items-center gap-3">
            {/* Départ */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                {t.pickupGov}
              </label>
              <select
                value={form.pickup_governorate}
                onChange={(e) => update("pickup_governorate", e.target.value)}
                className="w-full px-3.5 py-3 border border-neutral-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">{t.chooseGov}</option>
                {GOVERNORATES.map((g) => (
                  <option
                    key={g}
                    value={g}
                    disabled={g === form.dropoff_governorate}
                  >
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Arrow */}
            <div className="pt-5 flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-purple-600" />
              </div>
            </div>

            {/* Destination */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                {t.dropoffGov}
              </label>
              <select
                value={form.dropoff_governorate}
                onChange={(e) => update("dropoff_governorate", e.target.value)}
                className="w-full px-3.5 py-3 border border-neutral-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">{t.chooseGov}</option>
                {GOVERNORATES.map((g) => (
                  <option
                    key={g}
                    value={g}
                    disabled={g === form.pickup_governorate}
                  >
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Same governorate error */}
          {form.pickup_governorate &&
            form.dropoff_governorate &&
            form.pickup_governorate === form.dropoff_governorate && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <Info className="w-3 h-3" /> {t.sameGovError}
              </p>
            )}

          {/* Optional address details */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <input
              type="text"
              value={form.pickup_address}
              onChange={(e) => update("pickup_address", e.target.value)}
              placeholder={t.pickupAddr}
              className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
            />
            <input
              type="text"
              value={form.dropoff_address}
              onChange={(e) => update("dropoff_address", e.target.value)}
              placeholder={t.dropoffAddr}
              className="px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
            />
          </div>
        </div>

        {/* ---------- Section 2: Date ---------- */}
        <div className="p-6 border-b border-neutral-100">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-500" />
            {t.sectionWhen}
          </h3>
          <input
            type="datetime-local"
            value={form.scheduled_time}
            min={minDate}
            onChange={(e) => update("scheduled_time", e.target.value)}
            className="w-full px-3.5 py-3 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
          />
          <p className="text-xs text-neutral-400 mt-1.5">
            {t.whenHint}
          </p>
        </div>

        {/* ---------- Section 3: Véhicule ---------- */}
        <div className="p-6 border-b border-neutral-100">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4 text-purple-500" />
            {t.sectionVehicle}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {VEHICLE_TYPES.map((vt) => (
              <button
                key={vt.value}
                type="button"
                onClick={() => update("vehicle_type", vt.value)}
                className={`text-left px-3.5 py-3 rounded-xl border-2 transition-all duration-200 ${
                  form.vehicle_type === vt.value
                    ? "border-purple-500 bg-purple-50 shadow-sm shadow-purple-100"
                    : "border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <div
                  className={`text-sm font-semibold ${form.vehicle_type === vt.value ? "text-purple-700" : "text-neutral-700"}`}
                >
                  {vt.label}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {vt.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ---------- Section 4: Capacité & Prix ---------- */}
        <div className="p-6 border-b border-neutral-100">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-500" />
            {t.sectionCapacity}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                {t.capacityLabel}
              </label>
              <input
                type="text"
                value={form.available_capacity}
                onChange={(e) => update("available_capacity", e.target.value)}
                placeholder={t.capacityPlaceholder}
                className="w-full px-3.5 py-3 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5 flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5" />
                {t.priceLabel}
              </label>
              <input
                type="number"
                value={form.price_tnd_min}
                onChange={(e) => update("price_tnd_min", e.target.value)}
                placeholder={t.pricePlaceholder}
                className="w-full px-3.5 py-3 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
              />
            </div>
          </div>
        </div>

        {/* ---------- Section 5: Note (optional) ---------- */}
        <div className="p-6">
          <h3 className="text-sm font-semibold text-neutral-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-500" />
            {t.sectionNote}
          </h3>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={2}
            placeholder={t.notePlaceholder}
            className="w-full px-3.5 py-3 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none resize-none"
          />
        </div>
      </div>

      {/* ============ SUBMIT ============ */}
      <div className="mt-6 flex items-center justify-between">
        <Link
          href="/jobs"
          className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          {t.btnCancel}
        </Link>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="relative inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-purple-200 hover:shadow-lg hover:shadow-purple-300 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t.btnPublishing}
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {t.btnPublish}
            </>
          )}
        </button>
      </div>

      {/* Missing fields helper */}
      {!canSubmit && form.pickup_governorate && (
        <div className="mt-4 text-xs text-neutral-400 text-right">
          {!form.dropoff_governorate && "→ Choisissez une destination · "}
          {!form.scheduled_time && "→ Choisissez une date · "}
          {!form.vehicle_type && "→ Choisissez un véhicule"}
        </div>
      )}
    </div>
  );
}
