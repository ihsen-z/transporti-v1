"use client";

import { Check, Clock, Package, Truck, MapPin } from "lucide-react";
import type { Job } from "@/lib/services/types";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

interface JobTimelineProps {
  status: Job["status"];
}

interface TimelineStep {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// Map status to step index for progression
const statusToIndex: Record<string, number> = {
  PENDING: 0,
  ACCEPTED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  CANCELLED: -1, // Special case
};

export default function JobTimeline({ status }: JobTimelineProps) {
  const { t } = useAppI18n();
  const currentIndex = statusToIndex[status] ?? -1;
  const isCancelled = status === "CANCELLED";

  const timelineSteps: TimelineStep[] = [
    {
      id: "PENDING",
      label: t.jobsComponents.timeline.created,
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: "ACCEPTED",
      label: t.jobsComponents.timeline.accepted,
      icon: <Check className="w-4 h-4" />,
    },
    {
      id: "IN_PROGRESS",
      label: t.jobsComponents.timeline.inProgress,
      icon: <Truck className="w-4 h-4" />,
    },
    {
      id: "COMPLETED",
      label: t.jobsComponents.timeline.delivered,
      icon: <MapPin className="w-4 h-4" />,
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
      <h3 className="text-lg font-bold text-neutral-900 mb-6">
        {t.jobsComponents.timeline.title}
      </h3>

      {isCancelled ? (
        <div className="flex items-center gap-3 p-4 bg-neutral-100 rounded-lg">
          <div className="w-10 h-10 bg-neutral-300 text-neutral-600 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-neutral-700">
              {t.jobsComponents.timeline.cancelledTitle}
            </p>
            <p className="text-sm text-neutral-500">
              {t.jobsComponents.timeline.cancelledDesc}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Timeline - Horizontal */}
          <div className="hidden sm:block">
            <div className="flex items-center justify-between">
              {timelineSteps.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isUpcoming = index > currentIndex;

                return (
                  <div key={step.id} className="flex-1 flex items-center">
                    <div className="flex flex-col items-center flex-shrink-0">
                      {/* Step Circle */}
                      <div
                        className={`
                                                    w-10 h-10 rounded-full flex items-center justify-center transition-colors
                                                    ${isCompleted ? "bg-accent-500 text-white" : ""}
                                                    ${isCurrent ? "bg-brand-600 text-white ring-4 ring-brand-600/10" : ""}
                                                    ${isUpcoming ? "bg-neutral-200 text-neutral-400" : ""}
                                                `}
                      >
                        {isCompleted ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          step.icon
                        )}
                      </div>
                      {/* Label */}
                      <span
                        className={`
                                                    mt-2 text-sm font-medium text-center
                                                    ${isCompleted ? "text-accent-700" : ""}
                                                    ${isCurrent ? "text-brand-600" : ""}
                                                    ${isUpcoming ? "text-neutral-400" : ""}
                                                `}
                      >
                        {step.label}
                      </span>
                    </div>
                    {/* Connector Line */}
                    {index < timelineSteps.length - 1 && (
                      <div
                        className={`
                                                    flex-1 h-1 mx-2 rounded-full transition-colors
                                                    ${index < currentIndex ? "bg-accent-500" : "bg-neutral-200"}
                                                `}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Timeline - Vertical */}
          <div className="sm:hidden">
            <div className="space-y-0">
              {timelineSteps.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isUpcoming = index > currentIndex;
                const isLast = index === timelineSteps.length - 1;

                return (
                  <div key={step.id} className="flex items-start">
                    {/* Left side - Circle and Line */}
                    <div className="flex flex-col items-center me-4">
                      {/* Step Circle */}
                      <div
                        className={`
                                                    w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
                                                    ${isCompleted ? "bg-accent-500 text-white" : ""}
                                                    ${isCurrent ? "bg-brand-600 text-white ring-2 ring-brand-600/10" : ""}
                                                    ${isUpcoming ? "bg-neutral-200 text-neutral-400" : ""}
                                                `}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <span className="w-4 h-4 flex items-center justify-center">
                            {step.icon}
                          </span>
                        )}
                      </div>
                      {/* Connector Line */}
                      {!isLast && (
                        <div
                          className={`
                                                        w-0.5 h-8 transition-colors
                                                        ${index < currentIndex ? "bg-accent-500" : "bg-neutral-200"}
                                                    `}
                        />
                      )}
                    </div>
                    {/* Right side - Label */}
                    <div className={`pt-1 pb-6 ${isLast ? "pb-0" : ""}`}>
                      <span
                        className={`
                                                    text-sm font-medium
                                                    ${isCompleted ? "text-accent-700" : ""}
                                                    ${isCurrent ? "text-brand-600" : ""}
                                                    ${isUpcoming ? "text-neutral-400" : ""}
                                                `}
                      >
                        {step.label}
                      </span>
                      {isCurrent && (
                        <p className="text-xs text-brand-600 mt-0.5">
                          {t.jobsComponents.timeline.currentStep}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
