"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ApiError } from "@/lib/api/client";
import { publishReturnTrip } from "@/lib/services/returnTrips";
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
import { useVehiclePrefill, libelleCapacite } from "@/hooks/useVehiclePrefill";

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

/**
 * Retrouve un gouvernorat de la liste à partir d'une valeur externe.
 *
 * Le backend stocke `pickup_governorate` en texte libre : rien ne garantit que
 * « Gabès » y soit accentué, ni que la casse corresponde. Une comparaison
 * stricte échouerait **silencieusement** — le formulaire s'ouvrirait vide et
 * l'amorce de fin de mission (T4.4) perdrait tout son intérêt, sans erreur
 * visible pour le diagnostiquer.
 *
 * On compare donc sur une forme normalisée : accents retirés, casse ignorée.
 * Retourne la valeur canonique de la liste, ou null si rien ne correspond.
 */
function resoudreGouvernorat(valeur: string | null): string | null {
  if (!valeur) return null;
  const cible = valeur.trim();
  if (!cible) return null;
  // `sensitivity: "base"` ignore à la fois la casse et les accents. Préféré à
  // une normalisation NFD suivie d'un filtre de diacritiques : cette dernière
  // s'écrit avec des caractères combinants invisibles dans le source, qu'une
  // manipulation d'encodage casserait sans que rien ne le signale.
  return (
    GOVERNORATES.find(
      (g) => g.localeCompare(cible, "fr", { sensitivity: "base" }) === 0,
    ) ?? null
  );
}

/**
 * Date de départ pour un choix rapide, au format de `<input datetime-local>`.
 *
 * `joursApres = 0` signifie « aujourd'hui », et vaut **maintenant + 3 heures**,
 * pas 8 h du matin.
 *
 * Défaut trouvé en recette le 27/08 : la première version posait 8 h 00, une
 * heure déjà passée pour quiconque publie après le petit matin. Le champ la
 * refusait (son `min` est maintenant + 2 h) et la publication échouait en
 * silence. Or c'est précisément le cas d'usage visé — un transporteur qui vient
 * de livrer et rentre maintenant, souvent en fin de journée.
 *
 * Les jours suivants partent à 8 h : là, le matin est bien à venir.
 */
function dateDepartRapide(joursApres: number): string {
  const d = new Date();
  if (joursApres === 0) {
    d.setHours(d.getHours() + 3, 0, 0, 0);
  } else {
    d.setDate(d.getDate() + joursApres);
    d.setHours(8, 0, 0, 0);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const searchParams = useSearchParams();
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
  // D11 — instant booking opt-in (off by default)
  const [instantBooking, setInstantBooking] = useState(false);

  // T1.2 (lot 1) — pré-remplissage depuis le profil, extrait dans un hook.
  // Le véhicule et la capacité ne sont jamais ressaisis : c'est ce qui ramène
  // la publication à 4 saisies et rend tenable la promesse des 30 secondes.
  const { vehicule } = useVehiclePrefill();

  // Part de capacité choisie de façon tactile plutôt que saisie. `null` = le
  // transporteur préfère préciser lui-même.
  const [partCapacite, setPartCapacite] = useState<"tout" | "moitie" | null>(
    null,
  );

  useEffect(() => {
    if (!vehicule.disponible) return;
    setForm((prev) => {
      const next = { ...prev };
      if (!prev.vehicle_type && vehicule.type)
        next.vehicle_type = vehicule.type;
      if (!prev.available_capacity) {
        next.available_capacity = libelleCapacite(vehicule);
      }
      return next;
    });
  }, [vehicule]);

  // T4.4 — itinéraire pré-rempli par l'amorce de fin de mission. Le corridor
  // arrive déjà inversé (le transporteur a livré à `depuis`, il rentre vers
  // `vers`), et `quand=aujourdhui` évite la saisie de date. Un transporteur
  // venu de l'amorce n'a donc plus rien à saisir avant de publier.
  //
  // Les valeurs sont validées contre la liste des gouvernorats : un paramètre
  // d'URL arbitraire ne doit pas se retrouver dans le formulaire.
  useEffect(() => {
    const depuis = searchParams.get("depuis");
    const vers = searchParams.get("vers");
    const quand = searchParams.get("quand");

    setForm((prev) => {
      const next = { ...prev };
      const gouvernoratDepuis = resoudreGouvernorat(depuis);
      const gouvernoratVers = resoudreGouvernorat(vers);
      if (gouvernoratDepuis) next.pickup_governorate = gouvernoratDepuis;
      if (gouvernoratVers) next.dropoff_governorate = gouvernoratVers;
      if (quand === "aujourdhui" && !prev.scheduled_time) {
        next.scheduled_time = dateDepartRapide(0);
      }
      return next;
    });
  }, [searchParams]);

  // Capacité structurée envoyée au backend (B-2). Dérivée de la part choisie
  // appliquée à la capacité du véhicule. Reste `null` quand le profil ne porte
  // pas la donnée — on n'invente jamais un chiffre, et le volume n'est jamais
  // déduit du poids.
  const capaciteStructuree = (): {
    kg: number | null;
    m3: number | null;
  } => {
    if (partCapacite === null) return { kg: null, m3: null };
    const facteur = partCapacite === "tout" ? 1 : 0.5;
    return {
      kg:
        vehicule.capaciteKg !== null
          ? Math.round(vehicule.capaciteKg * facteur * 10) / 10
          : null,
      m3:
        vehicule.capaciteM3 !== null
          ? Math.round(vehicule.capaciteM3 * facteur * 100) / 100
          : null,
    };
  };

  // Sprint 5 — reverse matching: open classic requests on the corridor,
  // returned by the creation endpoint and shown on the success screen.
  const [matchingRequests, setMatchingRequests] = useState<
    {
      id: number;
      pickup_address: string;
      dropoff_address: string;
      scheduled_time?: string;
      price_tnd_min?: string | number | null;
      price_tnd_max?: string | number | null;
    }[]
  >([]);
  const [matchingCount, setMatchingCount] = useState(0);

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
        instant_booking: instantBooking,
      };

      // B-2 (lot 1) — capacité structurée, en plus du libellé texte ci-dessus
      // qui reste la description lisible. Envoyée seulement quand elle est
      // réellement connue : un 0 rendrait le trajet invisible au matching.
      const { kg, m3 } = capaciteStructuree();
      if (kg !== null) payload.available_capacity_kg = kg;
      if (m3 !== null) payload.available_capacity_m3 = m3;

      if (form.price_tnd_min)
        payload.price_tnd_min = parseFloat(form.price_tnd_min);

      const created =
        await publishReturnTrip<(typeof matchingRequests)[number]>(payload);
      setSuccess(true);
      showToast("success", t.successMsg);

      // Sprint 5 — reverse matching: show open requests on this corridor
      const reqs = created?.matching_requests ?? [];
      setMatchingRequests(reqs);
      setMatchingCount(created?.matching_requests_count ?? reqs.length);
      // Auto-redirect only when there is nothing to monetize right away.
      // Destination : l'inventaire (T1.3), pour que le transporteur voie son
      // trajet en ligne et puisse le gérer. Pointait vers /jobs tant que
      // l'inventaire n'existait pas.
      if (!reqs.length) {
        setTimeout(() => router.push("/retours"), 2000);
      }
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
      <div
        data-testid="retours-nouveau-confirmation"
        className="min-h-[80vh] flex items-center justify-center p-6"
      >
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
          <p className="text-neutral-500 mb-6">{t.successDesc}</p>

          {/* Sprint 5 — reverse matching: monetize the trip right away */}
          {matchingRequests.length > 0 && (
            <div className="mb-6 text-start bg-purple-50 border border-purple-200 rounded-2xl p-4">
              <p className="text-sm font-bold text-purple-800 mb-3">
                🎯 {matchingCount} {t.reverseMatchTitle}
              </p>
              <ul className="space-y-2">
                {matchingRequests.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/jobs/${r.id}`}
                      className="block bg-white rounded-xl p-3 border border-purple-100 hover:border-purple-300 transition-colors"
                    >
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {r.pickup_address} → {r.dropoff_address}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {r.price_tnd_min || r.price_tnd_max
                          ? `${r.price_tnd_min ?? "?"} — ${r.price_tnd_max ?? "?"} TND`
                          : t.reverseMatchNoBudget}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-purple-600 mt-2">
                {t.reverseMatchHint}
              </p>
            </div>
          )}

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
        <ChevronLeft className="w-4 h-4 rtl:-scale-x-100" />
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
        <p className="text-neutral-500 text-sm">{t.pageSubtitle}</p>
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
        {/* T1.2 — le véhicule vient du profil et n'est pas ressaisi. Présenté
            comme un fait acquis, pas comme un champ à remplir. */}
        {vehicule.disponible && (
          <div
            data-testid="retours-nouveau-vehicule-prerempli"
            className="mx-6 mt-6 px-4 py-3 rounded-xl bg-brand-50 border border-brand-600/20 flex items-center gap-3"
          >
            <Truck className="w-4 h-4 text-brand-600 shrink-0" />
            <p className="text-sm text-brand-700">
              <span className="font-semibold">{libelleCapacite(vehicule)}</span>
              <span className="text-brand-600/70"> · depuis votre profil</span>
            </p>
          </div>
        )}

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
                data-testid="retours-nouveau-depart"
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
                <ArrowRight className="w-4 h-4 text-purple-600 rtl:-scale-x-100" />
              </div>
            </div>

            {/* Destination */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">
                {t.dropoffGov}
              </label>
              <select
                data-testid="retours-nouveau-arrivee"
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
          {/* T1.2 — saisie 3 : choix tactile plutôt que calendrier. Un
              calendrier pour « je rentre aujourd'hui » est une friction pure. */}
          <div className="flex gap-2 mb-3">
            {(
              [
                { cle: "aujourdhui", label: "Aujourd'hui", jours: 0 },
                { cle: "demain", label: "Demain", jours: 1 },
              ] as const
            ).map((choix) => (
              <button
                key={choix.cle}
                type="button"
                data-testid={`retours-nouveau-date-${choix.cle}`}
                onClick={() =>
                  update("scheduled_time", dateDepartRapide(choix.jours))
                }
                className="flex-1 px-3 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-700 hover:border-purple-400 hover:bg-purple-50 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
              >
                {choix.label}
              </button>
            ))}
          </div>
          <input
            type="datetime-local"
            data-testid="retours-nouveau-date-autre"
            value={form.scheduled_time}
            min={minDate}
            onChange={(e) => update("scheduled_time", e.target.value)}
            className="w-full px-3.5 py-3 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
          />
          <p className="text-xs text-neutral-400 mt-1.5">{t.whenHint}</p>
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
                className={`text-start px-3.5 py-3 rounded-xl border-2 transition-all duration-200 ${
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
              {/* T1.2 — saisie 4 : la place restante par choix tactile. Les
                  parts sont appliquées à la capacité du profil, ce qui évite au
                  transporteur de calculer un tonnage restant de tête. Le champ
                  texte reste disponible pour préciser librement. */}
              {vehicule.disponible && (
                <div className="flex gap-2 mb-2">
                  {(
                    [
                      { cle: "tout", label: "Tout le camion" },
                      { cle: "moitie", label: "La moitié" },
                    ] as const
                  ).map((choix) => (
                    <button
                      key={choix.cle}
                      type="button"
                      data-testid={`retours-nouveau-capacite-${choix.cle}`}
                      onClick={() => {
                        setPartCapacite(choix.cle);
                        const facteur = choix.cle === "tout" ? 1 : 0.5;
                        const morceaux: string[] = [];
                        if (vehicule.capaciteKg !== null) {
                          morceaux.push(
                            `${Math.round(vehicule.capaciteKg * facteur * 10) / 10} kg`,
                          );
                        }
                        if (vehicule.capaciteM3 !== null) {
                          morceaux.push(
                            `${Math.round(vehicule.capaciteM3 * facteur * 100) / 100} m³`,
                          );
                        }
                        update(
                          "available_capacity",
                          morceaux.join(" · ") || choix.label,
                        );
                      }}
                      className={`flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all focus:ring-2 focus:ring-purple-500/20 outline-none ${
                        partCapacite === choix.cle
                          ? "border-purple-400 bg-purple-50 text-purple-700"
                          : "border-neutral-200 text-neutral-700 hover:border-purple-400 hover:bg-purple-50"
                      }`}
                    >
                      {choix.label}
                    </button>
                  ))}
                </div>
              )}
              <input
                type="text"
                data-testid="retours-nouveau-capacite-preciser"
                value={form.available_capacity}
                onChange={(e) => {
                  // Une saisie libre reprend la main : on cesse de déduire la
                  // capacité structurée d'une part, faute de savoir la lire.
                  setPartCapacite(null);
                  update("available_capacity", e.target.value);
                }}
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

          {/* D11 — instant booking opt-in */}
          <label className="mt-4 flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={instantBooking}
              onChange={(e) => setInstantBooking(e.target.checked)}
              className="mt-0.5 rounded"
            />
            <span className="text-sm text-neutral-700">
              <span className="font-semibold block">
                {t.instantBookingLabel}
              </span>
              <span className="text-xs text-neutral-500">
                {t.instantBookingHint}
              </span>
            </span>
          </label>
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
          data-testid="retours-nouveau-submit"
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
        <div className="mt-4 text-xs text-neutral-400 text-end">
          {!form.dropoff_governorate && "→ Choisissez une destination · "}
          {!form.scheduled_time && "→ Choisissez une date · "}
          {!form.vehicle_type && "→ Choisissez un véhicule"}
        </div>
      )}
    </div>
  );
}
