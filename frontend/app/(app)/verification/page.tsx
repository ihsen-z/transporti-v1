"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import { VerificationUpload } from "@/components/trust/VerificationUpload";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  ShieldAlert,
} from "lucide-react";
import { getMediaUrl } from "@/lib/imageUtils";
import { formatDate as formatDateI18n } from "@/lib/format";
import { useAppI18n } from "@/lib/i18n/useAppI18n";
import { interpolate } from "@/lib/i18n/interpolate";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface VerificationDoc {
  id: number;
  document_type: string;
  file_url: string;
  is_valid: boolean;
  uploaded_at: string;
  rejection_reason: string | null;
  reviewed_at: string | null;
  // WS-H — expiration (calculée côté serveur ; jamais recalculée ici).
  expires_at: string | null;
  is_expired: boolean;
  expires_soon: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function VerificationPage() {
  const { user } = useAuth();
  const { t } = useAppI18n();
  const [status, setStatus] = useState<string>("LOADING");
  const [documents, setDocuments] = useState<VerificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const docTypeLabel = (type: string): string =>
    (t.verify.docTypes as Record<string, string>)[type] || type;

  useEffect(() => {
    fetchStatus();
    fetchDocuments();
  }, []);

  const fetchStatus = async () => {
    try {
      const data = await apiClient.get<{ verification_status: string }>(
        "/api/trust/status/",
      );
      setStatus(data.verification_status);
    } catch (e) {
      console.error(e);
      setStatus("UNVERIFIED");
    }
  };

  const fetchDocuments = async () => {
    try {
      const data = await apiClient.get<VerificationDoc[]>(
        "/api/trust/documents/",
      );
      setDocuments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      await apiClient.put("/api/trust/submit/", {});
      showToast("success", t.verify.submitSuccess);
      fetchStatus();
    } catch (e) {
      console.error(e);
      showToast("error", t.verify.submitError);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mx-auto mb-3" />
          <p className="text-neutral-500">{t.common.loading}</p>
        </div>
      </div>
    );

  /* ── Status badge config ── */
  const getStatusDisplay = () => {
    switch (status) {
      case "VERIFIED":
        return {
          icon: <ShieldCheck className="w-10 h-10 text-accent-600" />,
          title: t.verify.verified,
          desc: t.verify.verifiedDescPage,
          bgClass:
            "bg-gradient-to-r from-accent-50 to-accent-100/50 border-accent-300",
          textClass: "text-accent-800",
        };
      case "PENDING":
        return {
          icon: <Clock className="w-10 h-10 text-brand-600" />,
          title: t.verify.pending,
          desc: t.verify.pendingDescPage,
          bgClass:
            "bg-gradient-to-r from-brand-600/5 to-brand-600/10 border-brand-600/20",
          textClass: "text-brand-600",
        };
      case "PARTIALLY_REVIEWED":
        return {
          icon: <ShieldAlert className="w-10 h-10 text-amber-600" />,
          title: t.verify.partialTitle,
          desc: t.verify.partialDesc,
          bgClass:
            "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200",
          textClass: "text-amber-800",
        };
      case "REJECTED":
        return {
          icon: <AlertTriangle className="w-10 h-10 text-red-600" />,
          title: t.verify.rejected,
          desc: t.verify.rejectedDescPage,
          bgClass: "bg-gradient-to-r from-red-50 to-rose-50 border-red-200",
          textClass: "text-red-800",
        };
      default:
        return {
          icon: <FileText className="w-10 h-10 text-brand-600" />,
          title: t.verify.requiredTitle,
          desc: t.verify.requiredDesc,
          bgClass:
            "bg-gradient-to-r from-neutral-50 to-neutral-100 border-neutral-200",
          textClass: "text-neutral-800",
        };
    }
  };

  const statusInfo = getStatusDisplay();
  const hasDocuments = documents.length >= 4;
  const showUploadForm = status === "UNVERIFIED" || status === "REJECTED";
  const showDocumentStatus = documents.length > 0 && status !== "UNVERIFIED";

  // Compute stats
  const approvedCount = documents.filter(
    (d) => d.is_valid && !d.rejection_reason,
  ).length;
  const rejectedCount = documents.filter((d) => d.rejection_reason).length;
  const pendingCount = documents.length - approvedCount - rejectedCount;
  const progressPct =
    documents.length > 0
      ? Math.round((approvedCount / documents.length) * 100)
      : 0;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return formatDateI18n(dateStr, undefined, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getDocStatus = (
    doc: VerificationDoc,
  ): "approved" | "rejected" | "pending" => {
    if (doc.rejection_reason) return "rejected";
    if (doc.is_valid) return "approved";
    return "pending";
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ── Status Header ── */}
        <div
          className={`p-6 rounded-2xl border-2 flex items-start gap-4 ${statusInfo.bgClass}`}
        >
          <div className="flex-shrink-0 mt-0.5">{statusInfo.icon}</div>
          <div className={statusInfo.textClass}>
            <h1 className="text-xl font-bold">{statusInfo.title}</h1>
            <p className="mt-1 text-sm opacity-90">{statusInfo.desc}</p>
          </div>
        </div>

        {/* ── Document Status Section ── */}
        {showDocumentStatus && (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
            {/* Progress Header */}
            <div className="p-5 border-b border-neutral-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-neutral-900">
                  {t.verify.docsStatusTitle}
                </h2>
                <button
                  onClick={() => {
                    fetchStatus();
                    fetchDocuments();
                  }}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-brand-600 hover:bg-brand-600/5 transition-colors"
                  title={t.verify.refreshTitle}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>{t.verify.progressLabel}</span>
                  <span className="font-semibold text-neutral-700">
                    {approvedCount}/{documents.length}{" "}
                    {approvedCount > 1
                      ? t.verify.approvedPlural
                      : t.verify.approved}
                  </span>
                </div>
                <div className="h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full animate-progress-fill"
                    style={{
                      width: `${progressPct}%`,
                      background:
                        progressPct === 100
                          ? "linear-gradient(90deg, #22c55e, #16a34a)"
                          : rejectedCount > 0
                            ? "linear-gradient(90deg, #f59e0b, #d97706)"
                            : "linear-gradient(90deg, #1E3A8A, #2563B3)",
                    }}
                  />
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-neutral-500">
                      {approvedCount}{" "}
                      {approvedCount > 1
                        ? t.verify.approvedPlural
                        : t.verify.approved}
                    </span>
                  </span>
                  {rejectedCount > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-neutral-500">
                        {rejectedCount}{" "}
                        {rejectedCount > 1
                          ? t.verify.rejectedWordPlural
                          : t.verify.rejectedWord}
                      </span>
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-neutral-300" />
                      <span className="text-neutral-500">
                        {pendingCount} {t.verify.pendingWord}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Document Cards */}
            <div className="divide-y divide-neutral-100">
              {documents.map((doc) => {
                const docStatus = getDocStatus(doc);
                const label = docTypeLabel(doc.document_type);

                return (
                  <div
                    key={doc.id}
                    className="p-4 hover:bg-neutral-50/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Status Icon */}
                      <div
                        className={`flex-shrink-0 mt-0.5 p-1.5 rounded-lg ${
                          docStatus === "approved"
                            ? "bg-accent-100 text-accent-600"
                            : docStatus === "rejected"
                              ? "bg-red-100 text-red-600"
                              : "bg-neutral-100 text-neutral-400"
                        }`}
                      >
                        {docStatus === "approved" && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        {docStatus === "rejected" && (
                          <XCircle className="w-4 h-4" />
                        )}
                        {docStatus === "pending" && (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-neutral-900">
                            {label}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              docStatus === "approved"
                                ? "bg-accent-100 text-accent-700"
                                : docStatus === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {docStatus === "approved" && t.verify.badgeApproved}
                            {docStatus === "rejected" && t.verify.badgeRejected}
                            {docStatus === "pending" && t.verify.badgePending}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-400 mt-0.5">
                          {t.verify.submittedOn} {formatDate(doc.uploaded_at)}
                          {doc.reviewed_at && (
                            <>
                              {" · "}
                              {t.verify.verifiedOn}{" "}
                              {formatDate(doc.reviewed_at)}
                            </>
                          )}
                        </p>

                        {/* WS-H — statut d'expiration (calculé côté serveur) */}
                        {doc.expires_at && (
                          <div
                            className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              doc.is_expired
                                ? "bg-red-100 text-red-700"
                                : doc.expires_soon
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {doc.is_expired ? (
                              <AlertTriangle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {doc.is_expired
                              ? t.verify.docExpired
                              : doc.expires_soon
                                ? `${t.verify.docExpiresSoon} ${formatDate(doc.expires_at)}`
                                : `${t.verify.docExpiresOn} ${formatDate(doc.expires_at)}`}
                          </div>
                        )}

                        {/* Rejection Reason */}
                        {doc.rejection_reason && (
                          <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-red-800">
                                  {t.verify.rejectionReason}
                                </p>
                                <p className="text-xs text-red-700 mt-0.5">
                                  {doc.rejection_reason}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* View link */}
                      {doc.file_url && (
                        <a
                          href={getMediaUrl(doc.file_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-1.5 rounded-lg text-neutral-400 hover:text-brand-600 hover:bg-brand-600/5 transition-colors"
                          title={t.verify.viewDocument}
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Upload Form (only for UNVERIFIED or REJECTED) ── */}
        {showUploadForm && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 space-y-6">
            <h2 className="text-lg font-bold text-neutral-900">
              {status === "REJECTED"
                ? t.verify.resendDocs
                : t.verify.requiredDocs}
            </h2>

            {status === "REJECTED" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                {t.verify.correctHint}
              </div>
            )}

            <VerificationUpload
              category="ID_CARD"
              label={t.verify.uploadIdLabel}
              onUploadSuccess={fetchDocuments}
            />

            <VerificationUpload
              category="DRIVING_LICENSE"
              label={t.verify.uploadLicenseLabel}
              onUploadSuccess={fetchDocuments}
            />

            <VerificationUpload
              category="VEHICLE_REGISTRATION"
              label={t.verify.uploadRegistrationLabel}
              onUploadSuccess={fetchDocuments}
            />

            <VerificationUpload
              category="INSURANCE"
              label={t.verify.uploadInsuranceLabel}
              onUploadSuccess={fetchDocuments}
            />

            <div className="pt-4 border-t">
              <button
                onClick={handleSubmitReview}
                disabled={!hasDocuments}
                className="w-full py-3.5 bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-xl font-bold hover:from-accent-600 hover:to-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-accent-500/25 hover:scale-[1.01]"
              >
                {t.verify.submitForReview}
              </button>
              {!hasDocuments && (
                <p className="text-xs text-center text-neutral-500 mt-2">
                  {t.verify.minDocsHint}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
