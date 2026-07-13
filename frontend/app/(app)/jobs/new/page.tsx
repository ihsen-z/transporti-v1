"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Lightbulb,
  MapPin,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";
import type { JobFormData } from "@/lib/types/jobs";
import { JobTypeSelector } from "@/components/jobs/JobTypeSelector";
import { LocationPicker } from "@/components/jobs/LocationPicker";
import { TransportDetailsForm } from "@/components/jobs/TransportDetailsForm";
import { MovingDetailsForm } from "@/components/jobs/MovingDetailsForm";
import { JobPreview } from "@/components/jobs/JobPreview";

const STEPS = [
  { id: "type" },
  { id: "location" },
  { id: "details" },
  { id: "schedule" },
  { id: "preview" },
];

// Délai minimum avant la date souhaitée — règle unique, affichée et validée.
const MIN_SCHEDULE_DELAY_MS = 24 * 60 * 60 * 1000;

// datetime-local attend une valeur en heure LOCALE ; toISOString() (UTC)
// décalerait la borne d'une heure en Tunisie.
const toLocalDatetimeValue = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const makeInitialFormData = (isReturnTrip: boolean): JobFormData => ({
  job_type: (isReturnTrip ? "TRANSPORT" : null) as
    | "TRANSPORT"
    | "MOVING"
    | null,
  pickup_address: "",
  pickup_governorate: "",
  pickup_lat: null as number | null,
  pickup_lng: null as number | null,
  pickup_hint: "",
  dropoff_address: "",
  dropoff_governorate: "",
  dropoff_lat: null as number | null,
  dropoff_lng: null as number | null,
  dropoff_hint: "",
  description: "",
  photos: [] as string[],
  specifications: {},
  scheduled_time: "",
  price_tnd_min: "",
  price_tnd_max: "",
  available_capacity: "", // For return trips only
});

export default function NewJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReturnTrip = searchParams.get("return_trip") === "true";
  const { user } = useAuth();
  const { t } = useAppI18n();
  const stepTitles = [
    t.newJob.step1,
    t.newJob.step2,
    t.newJob.step3,
    t.newJob.step4,
    t.newJob.step5,
  ];
  const [currentStep, setCurrentStep] = useState(isReturnTrip ? 1 : 0); // skip type for return trips
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const [formData, setFormData] = useState<JobFormData>(() =>
    makeInitialFormData(isReturnTrip),
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  /* -------------- Brouillon (localStorage) -------------- */
  const DRAFT_KEY = isReturnTrip
    ? "transporti-job-draft-return"
    : "transporti-job-draft";
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Restauration au montage — un refresh ou un retour arrière ne perd plus le formulaire.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft?.formData) {
          setFormData((prev) => ({ ...prev, ...draft.formData }));
          if (
            typeof draft.currentStep === "number" &&
            draft.currentStep >= 0 &&
            draft.currentStep < STEPS.length
          ) {
            setCurrentStep(draft.currentStep);
          }
          setDraftRestored(true);
        }
      }
    } catch {
      // brouillon corrompu — on repart de zéro
    }
    setDraftLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sauvegarde à chaque modification (après la restauration initiale).
  useEffect(() => {
    if (!draftLoaded) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ formData, currentStep }));
    } catch {
      // stockage plein/indisponible — non bloquant
    }
  }, [formData, currentStep, draftLoaded, DRAFT_KEY]);

  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setFormData(makeInitialFormData(isReturnTrip));
    setCurrentStep(isReturnTrip ? 1 : 0);
    setDraftRestored(false);
    setValidationError(null);
  };

  // L5: Price estimation state
  const [priceEstimate, setPriceEstimate] = useState<{
    min: number;
    max: number;
    distance_km: number;
    grid_source: string;
  } | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  // L5: Fetch price estimate when coordinates and job_type are set
  useEffect(() => {
    const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, job_type } =
      formData;
    if (pickup_lat && pickup_lng && dropoff_lat && dropoff_lng && job_type) {
      const fetchEstimate = async () => {
        setEstimateLoading(true);
        try {
          const result = await apiClient.post<{
            min: number;
            max: number;
            distance_km: number;
            grid_source: string;
          }>("/api/jobs/estimate-price/", {
            pickup_lat,
            pickup_lng,
            dropoff_lat,
            dropoff_lng,
            job_type,
          });
          const estimate = result as {
            min: number;
            max: number;
            distance_km: number;
            grid_source: string;
          };
          setPriceEstimate(estimate);
          // Pre-fill budget if empty
          if (!formData.price_tnd_min && !formData.price_tnd_max) {
            updateFormData({
              price_tnd_min: String(estimate.min),
              price_tnd_max: String(estimate.max),
            });
          }
        } catch (_err) {
          // Non-blocking
          setPriceEstimate(null);
        } finally {
          setEstimateLoading(false);
        }
      };
      fetchEstimate();
    }
  }, [
    formData.pickup_lat,
    formData.pickup_lng,
    formData.dropoff_lat,
    formData.dropoff_lng,
    formData.job_type,
  ]);

  // Validation bloquante par étape — les erreurs apparaissent avant "Suivant",
  // pas au moment de la publication.
  const validateStep = (step: number): string | null => {
    switch (step) {
      case 0:
        if (!formData.job_type) return t.newJob.chooseServiceType;
        return null;
      case 1: {
        const missing: string[] = [];
        if (!formData.pickup_address.trim())
          missing.push(t.newJob.fieldPickupAddress);
        if (!formData.pickup_governorate)
          missing.push(t.newJob.fieldPickupGovLower);
        if (!formData.dropoff_address.trim())
          missing.push(t.newJob.fieldDropoffAddress);
        if (!formData.dropoff_governorate)
          missing.push(t.newJob.fieldDropoffGovLower);
        if (missing.length > 0)
          return interpolate(t.newJob.fillFields, { fields: missing.join(", ") });
        return null;
      }
      case 3: {
        if (!formData.scheduled_time) return t.newJob.selectDateTime;
        const selected = new Date(formData.scheduled_time);
        if (selected.getTime() < Date.now() + MIN_SCHEDULE_DELAY_MS)
          return t.newJob.dateMin24h;
        if (
          formData.price_tnd_min &&
          formData.price_tnd_max &&
          Number(formData.price_tnd_min) > Number(formData.price_tnd_max)
        )
          return t.newJob.budgetMinMax;
        return null;
      }
      default:
        return null;
    }
  };

  const handleNext = () => {
    const error = validateStep(currentStep);
    setValidationError(error);
    if (error) return;

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setValidationError(null);
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Clean up data before sending
      const payload: Record<string, any> = { ...formData };

      // Round lat/lng to 6 decimal places for DecimalField compatibility
      if (payload.pickup_lat != null)
        payload.pickup_lat = Number(Number(payload.pickup_lat).toFixed(6));
      if (payload.pickup_lng != null)
        payload.pickup_lng = Number(Number(payload.pickup_lng).toFixed(6));
      if (payload.dropoff_lat != null)
        payload.dropoff_lat = Number(Number(payload.dropoff_lat).toFixed(6));
      if (payload.dropoff_lng != null)
        payload.dropoff_lng = Number(Number(payload.dropoff_lng).toFixed(6));

      // Convert empty strings to null for optional DecimalFields
      if (!payload.price_tnd_min) payload.price_tnd_min = null;
      if (!payload.price_tnd_max) payload.price_tnd_max = null;

      // Remove null lat/lng to avoid sending empty values
      if (payload.pickup_lat == null) delete payload.pickup_lat;
      if (payload.pickup_lng == null) delete payload.pickup_lng;
      if (payload.dropoff_lat == null) delete payload.dropoff_lat;
      if (payload.dropoff_lng == null) delete payload.dropoff_lng;

      // Use different endpoint for return trips
      const endpoint = isReturnTrip ? "/api/jobs/return-trip/" : "/api/jobs/";
      const data = await apiClient.post<{
        message: string;
        job: { id: number };
      }>(endpoint, payload);

      if (data && data.job) {
        // Publication réussie : le brouillon n'a plus de raison d'être.
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {}
        router.push(`/jobs/${data.job.id}`);
      } else {
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {}
        router.push("/jobs");
      }
    } catch (error: unknown) {
      console.error("Publish Error:", error);

      let errorMessage: string = t.newJob.publishGenericError;

      if (error instanceof ApiError && error.body) {
        // Erreurs par champ traduites en libellés lisibles, affichées dans
        // une bannière persistante (un toast de 4 s est illisible ici).
        const fieldLabels = t.newJob.fieldLabels as Record<string, string>;
        const fieldErrors = Object.entries(error.body)
          .map(([key, val]) => {
            const label = fieldLabels[key] || key;
            const text = Array.isArray(val) ? val.join(", ") : String(val);
            return `${label} : ${text}`;
          })
          .join(" — ");
        errorMessage = interpolate(t.newJob.publishImpossible, {
          errors: fieldErrors,
        });
      } else if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }

      setValidationError(errorMessage);
      showToast("error", t.newJob.publishCheckForm);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (newData: Partial<JobFormData>) => {
    setFormData((prev) => {
      const updated = { ...prev, ...newData };
      // Ensure specifications is merged, not replaced
      if (newData.specifications && prev.specifications) {
        updated.specifications = {
          ...prev.specifications,
          ...newData.specifications,
        };
      }
      return updated;
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <JobTypeSelector
            selectedType={formData.job_type}
            onSelect={(type) => updateFormData({ job_type: type })}
          />
        );
      case 1:
        return <LocationPicker data={formData} onChange={updateFormData} />;
      case 2:
        return formData.job_type === "TRANSPORT" ? (
          <TransportDetailsForm data={formData} onChange={updateFormData} />
        ) : (
          <MovingDetailsForm data={formData} onChange={updateFormData} />
        );
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {t.newJob.dateTimeLabel}
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_time}
                min={toLocalDatetimeValue(
                  new Date(Date.now() + MIN_SCHEDULE_DELAY_MS),
                )}
                onChange={(e) => {
                  updateFormData({ scheduled_time: e.target.value });
                  setValidationError(null);
                }}
                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-accent-500 transition-colors ${
                  validationError
                    ? "border-red-400 bg-red-50"
                    : "border-neutral-300"
                }`}
              />
              {validationError ? (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationError}
                </p>
              ) : (
                <p className="text-sm text-neutral-500 mt-1">
                  {t.newJob.dateTimeHint}
                </p>
              )}
            </div>

            {/* L5: Price estimation badge */}
            {priceEstimate && (
              <div className="p-3 bg-accent-50 border border-accent-200 rounded-xl flex items-center gap-3 text-sm">
                <Lightbulb className="w-5 h-5 text-accent-600 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-accent-800">
                    {interpolate(t.newJob.priceEstimate, {
                      min: priceEstimate.min,
                      max: priceEstimate.max,
                    })}
                  </span>
                  <span className="text-accent-600 ms-2 inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {interpolate(t.newJob.distanceKm, {
                      km: priceEstimate.distance_km,
                    })}
                  </span>
                </div>
              </div>
            )}
            {estimateLoading && (
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-500 animate-pulse">
                {t.newJob.estimateLoading}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {t.newJob.budgetMinShort}
                </label>
                <input
                  type="number"
                  value={formData.price_tnd_min}
                  onChange={(e) =>
                    updateFormData({ price_tnd_min: e.target.value })
                  }
                  placeholder={
                    priceEstimate
                      ? String(priceEstimate.min)
                      : t.newJob.budgetOptional
                  }
                  className="w-full p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {t.newJob.budgetMaxShort}
                </label>
                <input
                  type="number"
                  value={formData.price_tnd_max}
                  onChange={(e) =>
                    updateFormData({ price_tnd_max: e.target.value })
                  }
                  placeholder={
                    priceEstimate
                      ? String(priceEstimate.max)
                      : t.newJob.budgetOptional
                  }
                  className="w-full p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>

            {/* Available capacity for return trips */}
            {isReturnTrip && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  {t.newJob.capacityLabel}
                </label>
                <input
                  type="text"
                  value={formData.available_capacity}
                  onChange={(e) =>
                    updateFormData({ available_capacity: e.target.value })
                  }
                  placeholder={t.newJob.capacityPlaceholder}
                  className="w-full p-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-accent-500"
                />
                <p className="text-sm text-neutral-500 mt-1">
                  {t.newJob.capacityHint}
                </p>
              </div>
            )}
          </div>
        );
      case 4:
        return <JobPreview data={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className="flex flex-col items-center flex-1 relative"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold z-10 transition-colors
                    ${
                      index <= currentStep
                        ? "bg-brand-600 text-white"
                        : "bg-neutral-200 text-neutral-500"
                    }`}
                >
                  {index < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="text-xs mt-2 text-neutral-600 hidden sm:block">
                  {stepTitles[index]}
                </span>

                {/* Connecting Line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-[2px] -z-0 transition-colors
                    ${index < currentStep ? "bg-brand-600" : "bg-neutral-200"}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">
            {isReturnTrip && currentStep === 0
              ? t.newJob.returnTripTitle
              : stepTitles[currentStep]}
          </h2>

          {/* Return trip header info */}
          {isReturnTrip && currentStep <= 1 && (
            <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-sm text-purple-700 font-medium">
                {t.newJob.returnBannerPre}
                <strong>{t.newJob.returnBannerBold}</strong>
                {t.newJob.returnBannerPost}
              </p>
            </div>
          )}

          {/* Brouillon restauré */}
          {draftRestored && (
            <div className="mb-6 flex items-center justify-between gap-3 bg-brand-600/5 border border-brand-600/20 rounded-xl p-3 text-sm">
              <p className="text-brand-700">
                {t.newJob.draftRestored}
              </p>
              <button
                type="button"
                onClick={discardDraft}
                className="flex-shrink-0 text-brand-600 font-medium hover:underline"
              >
                {t.newJob.draftRestart}
              </button>
            </div>
          )}

          {renderStep()}

          {/* Erreur de validation (l'étape Date & Budget a son affichage inline) */}
          {validationError && currentStep !== 3 && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2 bg-error-50 border border-error-200 rounded-xl p-3 text-sm text-error-700"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>{validationError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex justify-between pt-6 border-t">
            <button
              onClick={handleBack}
              disabled={currentStep === 0 || loading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors
                ${
                  currentStep === 0
                    ? "text-neutral-300 cursor-not-allowed"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
            >
              <ChevronLeft className="w-5 h-5 rtl:-scale-x-100" />
              {t.newJob.backBtn}
            </button>

            <button
              onClick={handleNext}
              disabled={loading || (currentStep === 0 && !formData.job_type)}
              className="flex items-center gap-2 px-8 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                t.newJob.publishing
              ) : currentStep === STEPS.length - 1 ? (
                t.newJob.publishRequest
              ) : (
                <>
                  {t.newJob.nextBtn}
                  <ChevronRight className="w-5 h-5 rtl:-scale-x-100" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
