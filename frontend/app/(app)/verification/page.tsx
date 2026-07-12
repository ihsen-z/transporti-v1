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
}

const DOC_TYPE_LABELS: Record<string, string> = {
  CIN_FRONT: "Carte d'identité (Recto)",
  CIN_BACK: "Carte d'identité (Verso)",
  LICENSE_FRONT: "Permis de conduire (Recto)",
  LICENSE_BACK: "Permis de conduire (Verso)",
  CARTE_GRISE_FRONT: "Carte grise (Recto)",
  CARTE_GRISE_BACK: "Carte grise (Verso)",
  INSURANCE_FRONT: "Assurance véhicule (Recto)",
  INSURANCE_BACK: "Assurance véhicule (Verso)",
  SELFIE: "Selfie avec pièce d'identité",
  // Legacy
  CARTE_GRISE: "Carte grise",
  INSURANCE: "Assurance véhicule",
  LICENSE: "Licence professionnelle",
  ID_CARD: "Carte d'identité",
  DRIVING_LICENSE: "Permis de conduire",
  VEHICLE_REGISTRATION: "Carte grise",
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function VerificationPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string>("LOADING");
  const [documents, setDocuments] = useState<VerificationDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

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
      showToast("success", "Profil soumis pour vérification !");
      fetchStatus();
    } catch (e) {
      console.error(e);
      showToast("error", "Erreur lors de la soumission.");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600 mx-auto mb-3" />
          <p className="text-neutral-500">Chargement...</p>
        </div>
      </div>
    );

  /* ── Status badge config ── */
  const getStatusDisplay = () => {
    switch (status) {
      case "VERIFIED":
        return {
          icon: <ShieldCheck className="w-10 h-10 text-accent-600" />,
          title: "Profil Vérifié ✓",
          desc: "Félicitations ! Votre identité est confirmée. Vous pouvez répondre aux offres.",
          bgClass:
            "bg-gradient-to-r from-accent-50 to-accent-100/50 border-accent-300",
          textClass: "text-accent-800",
        };
      case "PENDING":
        return {
          icon: <Clock className="w-10 h-10 text-brand-600" />,
          title: "En cours de vérification",
          desc: "Nos équipes examinent vos documents. Délai estimé : 24-48h.",
          bgClass:
            "bg-gradient-to-r from-brand-600/5 to-brand-600/10 border-brand-600/20",
          textClass: "text-brand-600",
        };
      case "PARTIALLY_REVIEWED":
        return {
          icon: <ShieldAlert className="w-10 h-10 text-amber-600" />,
          title: "Vérification en cours",
          desc: "Certains documents ont été vérifiés. Consultez le détail ci-dessous.",
          bgClass:
            "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200",
          textClass: "text-amber-800",
        };
      case "REJECTED":
        return {
          icon: <AlertTriangle className="w-10 h-10 text-red-600" />,
          title: "Vérification Refusée",
          desc: "Un ou plusieurs documents ne sont pas valides. Consultez les motifs ci-dessous.",
          bgClass: "bg-gradient-to-r from-red-50 to-rose-50 border-red-200",
          textClass: "text-red-800",
        };
      default:
        return {
          icon: <FileText className="w-10 h-10 text-brand-600" />,
          title: "Vérification Requise",
          desc: "Pour répondre aux offres, vous devez vérifier votre identité.",
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
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", {
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
                  État de vos documents
                </h2>
                <button
                  onClick={() => {
                    fetchStatus();
                    fetchDocuments();
                  }}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-brand-600 hover:bg-brand-600/5 transition-colors"
                  title="Rafraîchir"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-neutral-500">
                  <span>Progression de la vérification</span>
                  <span className="font-semibold text-neutral-700">
                    {approvedCount}/{documents.length} approuvé
                    {approvedCount > 1 ? "s" : ""}
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
                      {approvedCount} approuvé{approvedCount > 1 ? "s" : ""}
                    </span>
                  </span>
                  {rejectedCount > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-neutral-500">
                        {rejectedCount} rejeté{rejectedCount > 1 ? "s" : ""}
                      </span>
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-neutral-300" />
                      <span className="text-neutral-500">
                        {pendingCount} en attente
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
                const label =
                  DOC_TYPE_LABELS[doc.document_type] || doc.document_type;

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
                            {docStatus === "approved" && "✓ Approuvé"}
                            {docStatus === "rejected" && "✗ Rejeté"}
                            {docStatus === "pending" && "⏳ En attente"}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-400 mt-0.5">
                          Soumis le {formatDate(doc.uploaded_at)}
                          {doc.reviewed_at && (
                            <> · Vérifié le {formatDate(doc.reviewed_at)}</>
                          )}
                        </p>

                        {/* Rejection Reason */}
                        {doc.rejection_reason && (
                          <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-red-800">
                                  Motif du rejet :
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
                          title="Voir le document"
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
                ? "Renvoyer vos documents"
                : "Documents requis"}
            </h2>

            {status === "REJECTED" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                💡 Corrigez les documents rejetés ci-dessus, puis renvoyez-les.
              </div>
            )}

            <VerificationUpload
              category="ID_CARD"
              label="Carte d'identité (Recto/Verso)"
              onUploadSuccess={fetchDocuments}
            />

            <VerificationUpload
              category="DRIVING_LICENSE"
              label="Permis de conduire (Recto/Verso)"
              onUploadSuccess={fetchDocuments}
            />

            <VerificationUpload
              category="VEHICLE_REGISTRATION"
              label="Carte grise (Recto/Verso)"
              onUploadSuccess={fetchDocuments}
            />

            <VerificationUpload
              category="INSURANCE"
              label="Assurance véhicule (Recto/Verso)"
              onUploadSuccess={fetchDocuments}
            />

            <div className="pt-4 border-t">
              <button
                onClick={handleSubmitReview}
                disabled={!hasDocuments}
                className="w-full py-3.5 bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-xl font-bold hover:from-accent-600 hover:to-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-accent-500/25 hover:scale-[1.01]"
              >
                Soumettre pour vérification
              </button>
              {!hasDocuments && (
                <p className="text-xs text-center text-neutral-500 mt-2">
                  Veuillez télécharger au moins le recto et verso de votre pièce
                  d&apos;identité et de votre permis de conduire.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
