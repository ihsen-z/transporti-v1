import React from "react";
import Link from "next/link";
import {
  MapPin,
  Calendar,
  Clock,
  Truck,
  Home,
  UserCheck,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface JobFeedCardProps {
  job: any;
}

export function JobFeedCard({ job }: JobFeedCardProps) {
  const isTransport = job.job_type === "TRANSPORT";

  // Urgency: job date < 48h from now
  const hoursUntilJob = Math.floor(
    (new Date(job.scheduled_time).getTime() - Date.now()) / (1000 * 60 * 60),
  );
  const isUrgent = hoursUntilJob > 0 && hoursUntilJob < 48;
  const offerCount = job.offer_count || 0;

  return (
    <div className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
      {/* Type Indicator Strip */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${isTransport ? "bg-brand-600" : "bg-orange-500"}`}
      />

      <div className="pl-3">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                isTransport
                  ? "bg-brand-600/10 text-brand-700"
                  : "bg-orange-100 text-orange-800"
              }`}
            >
              {isTransport ? "Transport" : "Déménagement"}
            </span>
            <span className="text-xs text-neutral-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Publié {format(new Date(job.created_at), "d MMM", { locale: fr })}
            </span>
            {isUrgent && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">
                <Zap className="w-3 h-3" />
                Urgent
              </span>
            )}
            {job.is_return_trip && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                🔄 Trajet retour
              </span>
            )}
            {offerCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                <Users className="w-3 h-3" />
                {offerCount} offre{offerCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="text-right">
            {job.price_tnd_min || job.price_tnd_max ? (
              <p className="font-bold text-neutral-900">
                {job.price_tnd_min || "0"} - {job.price_tnd_max || "?"}{" "}
                <span className="text-xs font-normal text-neutral-500">
                  TND
                </span>
              </p>
            ) : (
              <p className="text-sm font-medium text-neutral-400">
                Budget non spécifié
              </p>
            )}
          </div>
        </div>

        {/* Route */}
        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center mt-1">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <div className="w-0.5 h-6 bg-neutral-200 my-0.5" />
              <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <p className="font-medium text-neutral-900 line-clamp-1">
                  {job.pickup_address}
                </p>
                <div className="flex items-center gap-2 text-xs text-brand-600 mt-0.5">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(job.scheduled_time), "EEEE d MMMM à HH:mm", {
                    locale: fr,
                  })}
                </div>
              </div>
              <div>
                <p className="font-medium text-neutral-900 line-clamp-1">
                  {job.dropoff_address}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Details & Action */}
        <div className="flex items-end justify-between border-t pt-3 mt-2">
          <div className="flex items-center gap-4 text-sm text-neutral-600">
            {isTransport ? (
              <>
                <span className="flex items-center gap-1">
                  <PackageIcon className="w-4 h-4 text-neutral-400" />
                  {job.specifications?.weight
                    ? `${job.specifications.weight} kg`
                    : "- kg"}
                </span>
                <span className="flex items-center gap-1">
                  <BoxIcon className="w-4 h-4 text-neutral-400" />
                  {job.specifications?.volume
                    ? `${job.specifications.volume} m³`
                    : "- m³"}
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <Home className="w-4 h-4 text-neutral-400" />
                  {job.specifications?.rooms || "?"} pièces
                </span>
                <span className="flex items-center gap-1">
                  <BuildingIcon className="w-4 h-4 text-neutral-400" />
                  Étage {job.specifications?.floor_pickup || "0"}
                </span>
              </>
            )}
          </div>

          <Link
            href={`/jobs/${job.id}`}
            className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Voir l'offre
          </Link>
        </div>
      </div>
    </div>
  );
}

// Helper Icons
const PackageIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16.5 9.4 7.5 4.21" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="M3.27 6.96 12 12.01l8.73-5.05" />
    <path d="M12 22.08V12" />
  </svg>
);

const BoxIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

const BuildingIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M12 6h.01" />
    <path d="M12 10h.01" />
    <path d="M12 14h.01" />
    <path d="M16 10h.01" />
    <path d="M16 14h.01" />
    <path d="M8 10h.01" />
    <path d="M8 14h.01" />
  </svg>
);
