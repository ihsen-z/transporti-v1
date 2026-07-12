"use client";

import dynamic from "next/dynamic";
import { Map } from "lucide-react";
import { getCoordinates } from "@/lib/map";
import type { Job } from "@/lib/services/types";

const RouteMap = dynamic(() => import("@/components/map/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-neutral-100 rounded-lg flex items-center justify-center">
      <Map className="w-8 h-8 text-neutral-400 animate-pulse" />
    </div>
  ),
});

interface MapPreviewCardProps {
  job?: Job | null;
}

export default function MapPreviewCard({ job }: MapPreviewCardProps) {
  if (!job) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-neutral-900">
              Transport actif
            </h3>
            <Map className="w-5 h-5 text-brand-600" />
          </div>
          <p className="text-sm text-neutral-500 mt-1">Aucun transport actif</p>
        </div>
        <div className="h-64 bg-neutral-100 flex items-center justify-center">
          <Map className="w-8 h-8 text-neutral-300" />
        </div>
      </div>
    );
  }

  const pickupName = job.pickup_address || job.pickup || "Tunis Centre";
  const deliveryName = job.dropoff_address || job.delivery || "Sousse Ville";
  const pickupCoords = getCoordinates(pickupName);
  const deliveryCoords = getCoordinates(deliveryName);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900">
            Transport actif
          </h3>
          <Map className="w-5 h-5 text-brand-600" />
        </div>
        <p className="text-sm text-neutral-600 mt-1 line-clamp-1">
          {pickupName} → {deliveryName}
        </p>
      </div>
      <RouteMap
        pickup={{ name: pickupName, coordinates: pickupCoords }}
        delivery={{ name: deliveryName, coordinates: deliveryCoords }}
        route={[pickupCoords, deliveryCoords]}
        status={job.status as "PENDING" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"}
        height="256px"
      />
    </div>
  );
}
