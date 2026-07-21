"use client";

import React from "react";
import Image from "next/image";
import {
  MapPin,
  Calendar,
  Package,
  Truck,
  Home,
  Navigation,
  Crosshair,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { getMediaUrl } from "@/lib/imageUtils";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";

import type { JobSpecifications } from "@/lib/types/jobs";

/**
 * Fields JobPreview actually renders — structurally satisfied by both the
 * wizard form state (JobFormData) and the API job detail (JobDetail).
 */
interface JobPreviewData {
  job_type?: string | null;
  pickup_address?: string;
  dropoff_address?: string;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  pickup_hint?: string;
  dropoff_hint?: string;
  scheduled_time?: string;
  description?: string;
  photos?: string[];
  specifications?: JobSpecifications;
  price_tnd_min?: number | string;
  price_tnd_max?: number | string;
}

interface JobPreviewProps {
  data: JobPreviewData;
  isOwner?: boolean;
}

export function JobPreview({ data, isOwner = true }: JobPreviewProps) {
  const { t } = useAppI18n();
  const isTransport = data.job_type === "TRANSPORT";

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-brand-600 to-brand-900 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-lg">
            {isTransport ? (
              <Truck className="w-6 h-6" />
            ) : (
              <Home className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-xl">
              {isTransport
                ? t.jobsComponents.preview.transportTitle
                : t.newJob.moving}
            </h3>
            <p className="text-blue-200 text-sm">
              {t.jobsComponents.preview.summary}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Pickup */}
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 mt-1 text-orange-300" />
            <div className="flex-1">
              <p className="text-xs text-primary-200 uppercase font-semibold">
                {t.jobsComponents.preview.departure}
              </p>
              <p className="font-medium">{data.pickup_address}</p>
              <p className="text-sm text-blue-200">
                {data.scheduled_time &&
                !isNaN(new Date(data.scheduled_time).getTime())
                  ? formatDate(data.scheduled_time, undefined, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : t.jobsComponents.preview.dateUnspecified}
              </p>
              {data.pickup_lat && data.pickup_lng && (
                <p className="text-xs text-primary-200 mt-1 flex items-center gap-1">
                  <Crosshair className="w-3 h-3" />
                  GPS: {Number(data.pickup_lat).toFixed(5)},{" "}
                  {Number(data.pickup_lng).toFixed(5)}
                  <a
                    href={`https://www.google.com/maps?q=${data.pickup_lat},${data.pickup_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ms-1 text-blue-200 hover:text-white underline"
                  >
                    {t.jobsComponents.preview.maps}
                  </a>
                </p>
              )}
              {data.pickup_hint && (
                <p className="text-xs text-orange-200 mt-1 flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  📍 {data.pickup_hint}
                </p>
              )}
            </div>
          </div>

          {/* Dropoff */}
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 mt-1 text-green-300" />
            <div className="flex-1">
              <p className="text-xs text-primary-200 uppercase font-semibold">
                {t.jobsComponents.preview.arrival}
              </p>
              <p className="font-medium">{data.dropoff_address}</p>
              {data.dropoff_lat && data.dropoff_lng && (
                <p className="text-xs text-primary-200 mt-1 flex items-center gap-1">
                  <Crosshair className="w-3 h-3" />
                  GPS: {Number(data.dropoff_lat).toFixed(5)},{" "}
                  {Number(data.dropoff_lng).toFixed(5)}
                  <a
                    href={`https://www.google.com/maps?q=${data.dropoff_lat},${data.dropoff_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ms-1 text-blue-200 hover:text-white underline"
                  >
                    {t.jobsComponents.preview.maps}
                  </a>
                </p>
              )}
              {data.dropoff_hint && (
                <p className="text-xs text-green-200 mt-1 flex items-center gap-1">
                  <Navigation className="w-3 h-3" />
                  📍 {data.dropoff_hint}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h4 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-neutral-500" />
          {t.jobsComponents.preview.missionDetails}
        </h4>

        {isTransport ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-neutral-50 p-3 rounded-lg">
              <span className="block text-neutral-500 text-xs">
                {t.jobsComponents.preview.weight}
              </span>
              <span className="font-medium">
                {data.specifications?.weight || "-"} kg
              </span>
            </div>
            <div className="bg-neutral-50 p-3 rounded-lg">
              <span className="block text-neutral-500 text-xs">
                {t.jobsComponents.preview.volume}
              </span>
              <span className="font-medium">
                {data.specifications?.volume || "-"} m³
              </span>
            </div>
            <div className="col-span-2 bg-neutral-50 p-3 rounded-lg">
              <span className="block text-neutral-500 text-xs mb-1">
                {t.jobsComponents.preview.description}
              </span>
              <p className="text-neutral-700">
                {data.description || t.jobsComponents.preview.noDescription}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-neutral-50 p-3 rounded-lg">
              <span className="block text-neutral-500 text-xs">
                {t.jobsComponents.preview.housingType}
              </span>
              <span className="font-medium">
                {data.specifications?.room_count || "-"}
              </span>
            </div>
            <div className="bg-neutral-50 p-3 rounded-lg">
              <span className="block text-neutral-500 text-xs">
                {t.jobsComponents.preview.estimatedVolume}
              </span>
              <span className="font-medium">
                {data.specifications?.volume || "-"} m³
              </span>
            </div>
            <div className="bg-neutral-50 p-3 rounded-lg">
              <span className="block text-neutral-500 text-xs text-orange-600 font-semibold mb-1">
                {t.jobsComponents.preview.departureFloor}
              </span>
              <span className="font-medium">
                {data.specifications?.floor_departure ?? 0} (
                {t.jobsComponents.preview.elevatorShort}{" "}
                {data.specifications?.elevator_departure ||
                  t.jobsComponents.preview.no}
                )
              </span>
            </div>
            <div className="bg-neutral-50 p-3 rounded-lg">
              <span className="block text-neutral-500 text-xs text-green-600 font-semibold mb-1">
                {t.jobsComponents.preview.arrivalFloor}
              </span>
              <span className="font-medium">
                {data.specifications?.floor_arrival ?? 0} (
                {t.jobsComponents.preview.elevatorShort}{" "}
                {data.specifications?.elevator_arrival ||
                  t.jobsComponents.preview.no}
                )
              </span>
            </div>
            <div className="col-span-2 bg-neutral-50 p-3 rounded-lg border-s-4 border-primary-400">
              <span className="block text-neutral-500 text-xs mb-1">
                {t.jobsComponents.preview.servicesHelpers}
              </span>
              <p className="text-neutral-700 font-medium whitespace-pre-line">
                {interpolate(t.jobsComponents.preview.helpersWanted, {
                  n: data.specifications?.helpers_count ?? 0,
                })}
                {data.specifications?.needs_disassembly &&
                  t.jobsComponents.preview.needDisassembly}
                {data.specifications?.needs_packing &&
                  t.jobsComponents.preview.needPacking}
              </p>
            </div>
            <div className="col-span-2 bg-neutral-50 p-3 rounded-lg">
              <span className="block text-neutral-500 text-xs mb-1">
                {t.jobsComponents.preview.description}
              </span>
              <p className="text-neutral-700">
                {data.description || t.jobsComponents.preview.noDescription}
              </p>
            </div>
          </div>
        )}

        {data.photos && data.photos.length > 0 && (
          <div className="mt-4">
            <span className="block text-neutral-500 text-xs mb-2">
              {interpolate(t.jobsComponents.preview.photos, {
                n: data.photos.length,
              })}
            </span>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {data.photos.map((url: string, i: number) => (
                <Image
                  key={i}
                  src={getMediaUrl(url)}
                  alt=""
                  width={64}
                  height={64}
                  className="w-16 h-16 object-cover rounded-md border"
                />
              ))}
            </div>
          </div>
        )}

        {(data.price_tnd_min || data.price_tnd_max) && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex justify-between items-center">
              <span className="text-neutral-600 font-medium">
                {t.jobsComponents.preview.estimatedBudget}
              </span>
              <span className="text-xl font-bold text-neutral-900">
                {data.price_tnd_min || "0"} - {data.price_tnd_max || "?"}{" "}
                {t.jobsComponents.preview.tnd}
              </span>
            </div>
          </div>
        )}
      </div>

      {isOwner && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-800">
            <strong>{t.jobsComponents.preview.noteLabel}</strong>{" "}
            {t.jobsComponents.preview.noteText}
          </p>
        </div>
      )}
    </div>
  );
}
