"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getVerificationDocuments,
  getVerificationStatus,
  submitForReview,
  type DocumentDeVerification as VerificationDoc,
} from "@/lib/services/trust";
import { useToast } from "@/components/ui/Toast";
import { VerificationUpload } from "@/components/trust/VerificationUpload";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { getMediaUrl } from "@/lib/imageUtils";
import { formatDate as formatDateI18n } from "@/lib/format";
import { useAppI18n } from "@/lib/i18n/useAppI18n";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

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
      // Le service retombe deja sur UNVERIFIED : un statut inconnu ne doit
      // jamais etre pris pour une verification acquise.
      setStatus(await getVerificationStatus());
    } catch (e) {
      console.error(e);
      setStatus("UNVERIFIED");
    }
  };

  const fetchDocuments = async () => {
    try {
      setDocuments(await getVerificationDocuments());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      await submitForReview();
      showToast("success", t.verify.submitSuccess);
      fetchStatus();
    } catch (e) {
      console.error(e);
      showToast("error", t.verify.submitError);
    }
  };

  if (loading)
    return (
      <div className=" flex items-center justify-center">
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
          icon: (
            <ShieldCheck className="h-8 w-8 text-green-600" strokeWidth={2} />
          ),
          title: t.verify.verified,
          desc: t.verify.verifiedDescPage,
          bgClass: "bg-green-50",
          textClass: "text-green-800",
        };
      case "PENDING":
        return {
          icon: <Clock className="h-8 w-8 text-blue-700" strokeWidth={2} />,
          title: t.verify.pending,
          desc: t.verify.pendingDescPage,
          bgClass: "bg-blue-50",
          textClass: "text-blue-700",
        };
      case "PARTIALLY_REVIEWED":
        return {
          icon: (
            <ShieldAlert className="h-8 w-8 text-warning-600" strokeWidth={2} />
          ),
          title: t.verify.partialTitle,
          desc: t.verify.partialDesc,
          bgClass: "bg-warning-50",
          textClass: "text-warning-800",
        };
      case "REJECTED":
        return {
          icon: (
            <AlertTriangle className="h-8 w-8 text-error-600" strokeWidth={2} />
          ),
          title: t.verify.rejected,
          desc: t.verify.rejectedDescPage,
          bgClass: "bg-error-50",
          textClass: "text-error-700",
        };
      default:
        return {
          icon: <FileText className="h-8 w-8 text-blue-700" strokeWidth={2} />,
          title: t.verify.requiredTitle,
          desc: t.verify.requiredDesc,
          bgClass: "bg-surface shadow-card",
          textClass: "text-ink-900",
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
    <div className="px-5 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* ── Status Header ── */}
        <div
          className={`flex items-start gap-4 rounded-card p-5 sm:p-6 ${statusInfo.bgClass}`}
        >
          <div className="mt-0.5 flex-shrink-0">{statusInfo.icon}</div>
          <div className={`flex flex-col gap-1 ${statusInfo.textClass}`}>
            <h2 className="text-[19px] font-extrabold tracking-heading">
              {statusInfo.title}
            </h2>
            <p className="text-[14px] leading-[1.55] opacity-90">
              {statusInfo.desc}
            </p>
          </div>
        </div>

        {/* ── Document Status Section ── */}
        {showDocumentStatus && (
          <div className="bg-surface rounded-card shadow-card overflow-hidden">
            {/* Progress Header */}
            <div className="p-5 border-b border-line">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[17px] font-extrabold tracking-heading text-ink-900">
                  {t.verify.docsStatusTitle}
                </h2>
                <button
                  onClick={() => {
                    fetchStatus();
                    fetchDocuments();
                  }}
                  className="grid h-9 w-9 place-items-center rounded-chip text-ink-300 transition-colors hover:bg-app hover:text-blue-700"
                  title={t.verify.refreshTitle}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-[11.5px] font-semibold text-ink-500">
                  <span>{t.verify.progressLabel}</span>
                  <span className="font-bold text-ink-900 tabular">
                    {approvedCount}/{documents.length}{" "}
                    {approvedCount > 1
                      ? t.verify.approvedPlural
                      : t.verify.approved}
                  </span>
                </div>
                <div className="h-[5px] overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`animate-progress-fill h-full rounded-full ${
                      progressPct === 100
                        ? "bg-green-500"
                        : rejectedCount > 0
                          ? "bg-orange-500"
                          : "bg-blue-700"
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-4 text-[11.5px] font-semibold">
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
                      <span className="h-2 w-2 rounded-full bg-error-500" />
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
            <div className="divide-y divide-line">
              {documents.map((doc) => {
                const docStatus = getDocStatus(doc);
                const label = docTypeLabel(doc.document_type);

                return (
                  <div
                    key={doc.id}
                    className="p-4 transition-colors hover:bg-app"
                  >
                    <div className="flex items-start gap-3">
                      {/* Status Icon */}
                      <div
                        className={`mt-0.5 flex-shrink-0 rounded-chip p-1.5 ${
                          docStatus === "approved"
                            ? "bg-green-50 text-green-600"
                            : docStatus === "rejected"
                              ? "bg-error-50 text-error-600"
                              : "bg-neutral-100 text-ink-300"
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
                          <h3 className="text-[14px] font-bold text-ink-900">
                            {label}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              docStatus === "approved"
                                ? "bg-accent-100 text-accent-700"
                                : docStatus === "rejected"
                                  ? "bg-error-100 text-error-700"
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
                                ? "bg-error-100 text-error-700"
                                : doc.expires_soon
                                  ? "bg-warning-100 text-warning-700"
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
                          <div className="mt-2 p-2.5 bg-error-50 border border-error-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-error-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-error-700">
                                  {t.verify.rejectionReason}
                                </p>
                                <p className="text-xs text-error-700 mt-0.5">
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
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-200 flex flex-col gap-6">
            <h2 className="text-[17px] font-extrabold tracking-heading text-ink-900">
              {status === "REJECTED"
                ? t.verify.resendDocs
                : t.verify.requiredDocs}
            </h2>

            {status === "REJECTED" && (
              <div className="flex items-start gap-2 rounded-tile bg-warning-50 p-3.5 text-[14px] text-warning-800">
                <Lightbulb
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                  strokeWidth={2}
                />
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
                className="w-full py-3.5 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg"
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
