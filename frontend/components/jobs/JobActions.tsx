"use client";

import { useState, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Truck,
  Ban,
  AlertTriangle,
  Star,
  Loader2,
  Check,
  X,
} from "lucide-react";
import type { Job } from "@/lib/services/types";
import { apiClient } from "@/lib/api/client";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";

type JobStatus = Job["status"];

interface JobActionsProps {
  status: JobStatus;
  onStatusChange: (newStatus: JobStatus) => void;
  jobId: number;
}

interface ActionButton {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

interface FeedbackMessage {
  type: "success" | "error" | "warning";
  message: string;
}

export default function JobActions({
  status,
  onStatusChange,
  jobId,
}: JobActionsProps) {
  const { t } = useAppI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  // Clear feedback after 4 seconds
  const showFeedback = useCallback((msg: FeedbackMessage) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  // Generic action handler with API call
  const handleAction = useCallback(
    async (
      actionName: string,
      newStatus: JobStatus | null,
      successMessage: string,
    ) => {
      setIsLoading(true);
      setLoadingAction(actionName);

      try {
        if (newStatus) {
          await apiClient.patch(`/api/jobs/${jobId}/status/`, {
            status: newStatus,
          });
          onStatusChange(newStatus);
        }
        showFeedback({ type: "success", message: successMessage });
      } catch (error) {
        showFeedback({
          type: "error",
          message: t.jobsComponents.actions.genericError,
        });
      }

      setIsLoading(false);
      setLoadingAction(null);
    },
    [jobId, onStatusChange, showFeedback, t],
  );

  // Action handlers by status
  const handleAccept = () =>
    handleAction(
      "accept",
      "ACCEPTED",
      t.jobsComponents.actions.acceptedMsg,
    );

  const handleRefuse = () =>
    handleAction("refuse", "CANCELLED", t.jobsComponents.actions.refusedMsg);

  const handleStartTransport = () =>
    handleAction(
      "start",
      "IN_PROGRESS",
      t.jobsComponents.actions.startedMsg,
    );

  const handleCancel = () =>
    handleAction("cancel", "CANCELLED", t.jobsComponents.actions.cancelledMsg);

  const handleConfirmDelivery = () =>
    handleAction(
      "confirm",
      "COMPLETED",
      t.jobsComponents.actions.confirmedMsg,
    );

  const handleReportProblem = () => {
    showFeedback({
      type: "warning",
      message: t.jobsComponents.actions.problemMsg,
    });
  };

  const handleLeaveReview = () => {
    showFeedback({
      type: "success",
      message: t.jobsComponents.actions.reviewMsg,
    });
  };

  // Get actions based on current status
  const getActions = (): ActionButton[] => {
    switch (status) {
      case "PENDING":
        return [
          {
            label: t.jobsComponents.actions.accept,
            icon: <CheckCircle className="w-5 h-5" />,
            onClick: handleAccept,
            variant: "primary",
          },
          {
            label: t.jobsComponents.actions.refuse,
            icon: <XCircle className="w-5 h-5" />,
            onClick: handleRefuse,
            variant: "secondary",
          },
        ];
      case "ACCEPTED":
        return [
          {
            label: t.jobsComponents.actions.start,
            icon: <Truck className="w-5 h-5" />,
            onClick: handleStartTransport,
            variant: "primary",
          },
          {
            label: t.common.cancel,
            icon: <Ban className="w-5 h-5" />,
            onClick: handleCancel,
            variant: "danger",
          },
        ];
      case "IN_PROGRESS":
        return [
          {
            label: t.jobsComponents.actions.confirmDelivery,
            icon: <Check className="w-5 h-5" />,
            onClick: handleConfirmDelivery,
            variant: "primary",
          },
          {
            label: t.jobsComponents.actions.reportProblem,
            icon: <AlertTriangle className="w-5 h-5" />,
            onClick: handleReportProblem,
            variant: "secondary",
          },
        ];
      case "COMPLETED":
        return [
          {
            label: t.jobsComponents.actions.leaveReview,
            icon: <Star className="w-5 h-5" />,
            onClick: handleLeaveReview,
            variant: "primary",
          },
        ];
      default:
        return [];
    }
  };

  const actions = getActions();

  // Button style variants
  const getButtonStyles = (
    variant: ActionButton["variant"],
    isActionLoading: boolean,
  ) => {
    const base =
      "w-full flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

    if (isActionLoading) {
      return `${base} bg-neutral-100 text-neutral-500`;
    }

    switch (variant) {
      case "primary":
        return `${base} bg-accent-500 hover:bg-accent-600 active:bg-accent-700 text-white shadow-md hover:shadow-lg`;
      case "secondary":
        return `${base} bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 text-neutral-700`;
      case "danger":
        return `${base} bg-error-50 hover:bg-error-100 active:bg-error-200 text-error-600 border border-error-200`;
      default:
        return base;
    }
  };

  // Feedback message styles
  const getFeedbackStyles = (type: FeedbackMessage["type"]) => {
    switch (type) {
      case "success":
        return "bg-accent-50 border-accent-200 text-accent-800";
      case "error":
        return "bg-error-50 border-error-200 text-error-800";
      case "warning":
        return "bg-warning-50 border-warning-200 text-warning-800";
      default:
        return "bg-neutral-50 border-neutral-200 text-neutral-800";
    }
  };

  const getFeedbackIcon = (type: FeedbackMessage["type"]) => {
    switch (type) {
      case "success":
        return <Check className="w-5 h-5 text-accent-600" />;
      case "error":
        return <X className="w-5 h-5 text-error-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-warning-600" />;
      default:
        return null;
    }
  };

  // Render passive states for COMPLETED and CANCELLED
  if (status === "CANCELLED") {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
        <h3 className="text-lg font-bold text-neutral-900 mb-4">
          {t.jobsComponents.actions.statusTitle}
        </h3>
        <div className="flex items-center gap-3 p-4 bg-neutral-100 rounded-xl">
          <div className="w-10 h-10 bg-neutral-300 rounded-full flex items-center justify-center">
            <Ban className="w-5 h-5 text-neutral-600" />
          </div>
          <div>
            <p className="font-semibold text-neutral-700">
              {t.jobsComponents.actions.cancelledTitle}
            </p>
            <p className="text-sm text-neutral-500">
              {t.jobsComponents.actions.cancelledDesc}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
      <h3 className="text-lg font-bold text-neutral-900 mb-4">
        {status === "COMPLETED"
          ? t.jobsComponents.actions.completedTitle
          : t.jobsComponents.actions.title}
      </h3>

      {/* Completed Badge */}
      {status === "COMPLETED" && (
        <div className="flex items-center gap-3 p-4 bg-accent-50 rounded-xl mb-4 border border-accent-200">
          <div className="w-10 h-10 bg-accent-500 rounded-full flex items-center justify-center">
            <Check className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-accent-800">
              {t.jobsComponents.actions.completedBadge}
            </p>
            <p className="text-sm text-accent-600">
              {t.jobsComponents.actions.completedDesc}
            </p>
          </div>
        </div>
      )}

      {/* Feedback Message */}
      {feedback && (
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border mb-4 animate-pulse ${getFeedbackStyles(feedback.type)}`}
        >
          {getFeedbackIcon(feedback.type)}
          <p className="text-sm font-medium">{feedback.message}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {actions.map((action, index) => {
          const isActionLoading =
            isLoading &&
            loadingAction === action.label.toLowerCase().replace(/\s/g, "_");

          return (
            <button
              key={index}
              onClick={action.onClick}
              disabled={isLoading}
              className={getButtonStyles(
                action.variant,
                isLoading && loadingAction !== null,
              )}
            >
              {isActionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                action.icon
              )}
              <span>
                {isActionLoading
                  ? t.jobsComponents.actions.processing
                  : action.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Help Text */}
      {status !== "COMPLETED" && actions.length > 0 && (
        <p className="text-xs text-neutral-500 mt-4 text-center">
          {interpolate(t.jobsComponents.actions.transportRef, { id: jobId })}
        </p>
      )}
    </div>
  );
}
