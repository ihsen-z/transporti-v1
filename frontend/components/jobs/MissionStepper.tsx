"use client";

import React from "react";
import {
  FileText,
  Inbox,
  UserCheck,
  Truck,
  PackageCheck,
  Check,
} from "lucide-react";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";

interface MissionStepperProps {
  status: string;
  completedAt?: string;
}

function getActiveIndex(status: string): number {
  switch (status) {
    case "DRAFT":
      return -1;
    case "PUBLISHED":
      return 0;
    case "MATCHED":
      return 1;
    case "IN_PROGRESS":
      return 3;
    case "COMPLETED":
      return 4;
    case "CANCELLED":
      return -1;
    default:
      return 0;
  }
}

/**
 * MissionStepper — Visual progress indicator for job lifecycle (P1-02, P2-11).
 * Responsive: horizontal on desktop, vertical on mobile.
 */
export function MissionStepper({ status, completedAt }: MissionStepperProps) {
  const { t } = useAppI18n();
  const activeIndex = getActiveIndex(status);

  const STEPS = [
    { key: "PUBLISHED", label: t.jobsComponents.stepper.published, icon: FileText },
    { key: "HAS_OFFERS", label: t.jobsComponents.stepper.offersReceived, icon: Inbox },
    { key: "IN_PROGRESS", label: t.jobsComponents.stepper.assigned, icon: UserCheck },
    { key: "DELIVERING", label: t.jobsComponents.stepper.inProgress, icon: Truck },
    { key: "COMPLETED", label: t.jobsComponents.stepper.delivered, icon: PackageCheck },
  ];

  if (status === "DRAFT" || status === "CANCELLED") return null;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-5">
      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Background track */}
        <div className="absolute top-5 left-6 right-6 h-0.5 bg-neutral-200 z-0" />
        <div
          className="absolute top-5 left-6 h-0.5 bg-brand-600 z-0 transition-all duration-500"
          style={{
            width: `${Math.min(100, (activeIndex / (STEPS.length - 1)) * 100)}%`,
            maxWidth: "calc(100% - 48px)",
          }}
        />

        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === activeIndex;
          const isDone = i < activeIndex;

          return (
            <div
              key={step.key}
              className="flex flex-col items-center z-10 relative"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDone
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                    : isActive
                      ? "bg-brand-600 text-white ring-4 ring-brand-100 shadow-md shadow-brand-600/30"
                      : "bg-neutral-100 text-neutral-400 border border-neutral-200"
                }`}
              >
                {isDone ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-xs mt-2 font-medium whitespace-nowrap ${
                  isActive
                    ? "text-brand-600"
                    : isDone
                      ? "text-neutral-700"
                      : "text-neutral-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical compact */}
      <div className="sm:hidden space-y-1">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === activeIndex;
          const isDone = i < activeIndex;

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  isDone
                    ? "bg-brand-600 text-white"
                    : isActive
                      ? "bg-brand-600 text-white ring-2 ring-brand-100"
                      : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {isDone ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
              </div>
              <span
                className={`text-sm ${
                  isActive
                    ? "text-brand-600 font-semibold"
                    : isDone
                      ? "text-neutral-700"
                      : "text-neutral-400"
                }`}
              >
                {step.label}
              </span>
              {isActive && (
                <span className="ms-auto text-xs bg-brand-600/10 text-brand-600 px-2 py-0.5 rounded-full font-medium">
                  {t.jobsComponents.stepper.inProgressBadge}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion timestamp */}
      {status === "COMPLETED" && completedAt && (
        <p className="text-xs text-neutral-500 text-center mt-3">
          {interpolate(t.jobsComponents.stepper.deliveredOn, {
            date: new Date(completedAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          })}
        </p>
      )}
    </div>
  );
}
