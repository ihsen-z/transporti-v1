"use client";

import React from "react";
import Image from "next/image";
import { Truck, Weight, FileCheck, ShieldCheck, ImageOff } from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { getMediaUrl } from "@/lib/imageUtils";

interface Props {
  vehicleType: string;
  vehicleCapacityKg?: number;
  vehiclePhotos: string[];
  insuranceValidUntil?: string;
}

export function VehicleGallery({
  vehicleType,
  vehicleCapacityKg,
  vehiclePhotos,
  insuranceValidUntil,
}: Props) {
  const { t, locale } = useAppI18n();
  const isInsured =
    insuranceValidUntil && new Date(insuranceValidUntil) > new Date();

  return (
    <div className="rounded-2xl overflow-hidden border border-neutral-100 shadow-sm">
      {/* Header — deep navy */}
      <div className="px-6 py-4 bg-gradient-to-r from-brand-900 to-brand-600">
        <h3 className="text-base font-bold text-white tracking-wide">
          {t.profile.vehicle}
        </h3>
      </div>

      {/* Photos */}
      {vehiclePhotos.length > 0 ? (
        <div className="grid grid-cols-2 gap-1 p-1 bg-white">
          {vehiclePhotos.slice(0, 4).map((photo, idx) => (
            <div
              key={idx}
              className="aspect-video bg-neutral-100 rounded-lg overflow-hidden"
            >
              <Image
                src={getMediaUrl(photo)}
                alt={`Véhicule ${idx + 1}`}
                width={640}
                height={360}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600/5 to-brand-600/10 flex items-center justify-center mx-auto mb-3">
            <ImageOff className="w-7 h-7 text-brand-600/30" />
          </div>
          <p className="text-sm text-neutral-400">{t.profile.noVehiclePhoto}</p>
        </div>
      )}

      {/* Vehicle Details — with accent borders */}
      <div className="bg-white p-6 space-y-4 border-t border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-600/8 flex items-center justify-center">
            <Truck className="w-4.5 h-4.5 text-brand-600" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
              {t.profile.vehicleType}
            </p>
            <p className="text-sm font-medium text-neutral-900">
              {vehicleType || t.profile.notSpecified}
            </p>
          </div>
        </div>

        {vehicleCapacityKg && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-500/8 flex items-center justify-center">
              <Weight className="w-4.5 h-4.5 text-accent-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                {t.profile.capacity}
              </p>
              <p className="text-sm font-medium text-neutral-900">
                {vehicleCapacityKg.toLocaleString()} kg
              </p>
            </div>
          </div>
        )}

        {insuranceValidUntil && (
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${isInsured ? "bg-accent-500/8" : "bg-red-500/8"}`}
            >
              <ShieldCheck
                className={`w-4.5 h-4.5 ${isInsured ? "text-accent-600" : "text-red-600"}`}
              />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
                {t.profile.insurance}
              </p>
              <p
                className={`text-sm font-semibold ${isInsured ? "text-accent-600" : "text-red-600"}`}
              >
                {isInsured ? t.profile.insuranceValid : t.profile.insuranceExpired} — {t.profile.insuranceUntil}{" "}
                {new Date(insuranceValidUntil).toLocaleDateString(locale === 'ar' ? 'ar-TN' : 'fr-TN', {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
