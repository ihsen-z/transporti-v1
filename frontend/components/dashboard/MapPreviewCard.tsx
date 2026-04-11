"use client";

import dynamic from "next/dynamic";
import { Map } from "lucide-react";
import { mockRecentJobs } from "@/lib/dashboard";
import { getCoordinates, generateMockRoute } from "@/lib/map";

const RouteMap = dynamic(() => import("@/components/map/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-neutral-100 rounded-lg flex items-center justify-center">
      <Map className="w-8 h-8 text-neutral-400 animate-pulse" />
    </div>
  ),
});

export default function MapPreviewCard() {
  // Show the first in-progress or pending job
  const activeJob =
    mockRecentJobs.find(
      (j) => j.status === "IN_PROGRESS" || j.status === "ACCEPTED",
    ) || mockRecentJobs[0];

  const pickupCoords = getCoordinates(activeJob.pickup);
  const deliveryCoords = getCoordinates(activeJob.delivery);
  const route = generateMockRoute(pickupCoords, deliveryCoords);

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
          {activeJob.title}
        </p>
      </div>
      <RouteMap
        pickup={{
          name: activeJob.pickup,
          coordinates: pickupCoords,
        }}
        delivery={{
          name: activeJob.delivery,
          coordinates: deliveryCoords,
        }}
        route={route}
        status={activeJob.status}
        height="256px"
      />
    </div>
  );
}
