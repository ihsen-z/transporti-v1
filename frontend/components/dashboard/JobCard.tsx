"use client";

import { Truck, Package, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { getStatusColor, getStatusLabel } from "@/lib/dashboard";
import type { Job } from "@/lib/dashboard";

interface JobCardProps {
  job: Job;
}

export default function JobCard({ job }: JobCardProps) {
  const statusColor = getStatusColor(job.status);
  const statusLabel = getStatusLabel(job.status);

  // Use real API fields, fallback to legacy mock fields
  const pickup = job.pickup_address || job.pickup || "";
  const dropoff = job.dropoff_address || job.delivery || "";
  const offerCount = job.offer_count ?? 0;
  const isMoving = job.job_type === "MOVING";

  const timeAgo = job.created_at
    ? formatDistanceToNow(new Date(job.created_at), {
        addSuffix: true,
        locale: fr,
      })
    : "";

  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="bg-white rounded-xl border border-neutral-200 px-5 py-4 hover:shadow-md hover:border-brand-600/20 transition-all cursor-pointer flex items-center gap-4">
        {/* Job type icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isMoving ? "bg-purple-100" : "bg-brand-600/10"}`}
        >
          {isMoving ? (
            <Package className="w-5 h-5 text-purple-600" />
          ) : (
            <Truck className="w-5 h-5 text-brand-600" />
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Route: Pickup → Dropoff */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="font-semibold text-neutral-900 text-sm truncate max-w-[200px]">
              {pickup || "Adresse de départ"}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
            <span className="font-semibold text-neutral-900 text-sm truncate max-w-[200px]">
              {dropoff || "Destination"}
            </span>
          </div>

          {/* Meta: date + offer count */}
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo}
            </span>
            <span>·</span>
            <span>
              {offerCount} {offerCount === 1 ? "offre" : "offres"}
            </span>
          </div>
        </div>

        {/* Status badge */}
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>
    </Link>
  );
}
