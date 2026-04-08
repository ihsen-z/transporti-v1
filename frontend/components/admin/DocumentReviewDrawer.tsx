"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTransporterDocuments,
  reviewDocument,
  type AdminDocument,
  type TransporterDocumentsResponse,
} from "@/lib/services/admin";
import {
  X,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Eye,
  Shield,
  AlertTriangle,
  Loader2,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types & Config                                                             */
/* -------------------------------------------------------------------------- */

interface DocumentReviewDrawerProps {
  profileId: number;
  onClose: () => void;
  onStatusChanged?: () => void;
}

const docStatusConfig = {
  approved: {
    icon: CheckCircle,
    label: "Approuvé",
    bg: "bg-green-50 border-green-200",
    text: "text-green-700",
    badge: "bg-green-100 text-green-700",
  },
  rejected: {
    icon: XCircle,
    label: "Rejeté",
    bg: "bg-red-50 border-red-200",
    text: "text-red-700",
    badge: "bg-red-100 text-red-700",
  },
  pending: {
    icon: Clock,
    label: "En attente",
    bg: "bg-orange-50 border-orange-200",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-700",
  },
};

const profileStatusLabels: Record<string, { label: string; color: string }> = {
  UNVERIFIED: { label: "Non vérifié", color: "bg-slate-100 text-slate-600" },
  PENDING: { label: "En attente", color: "bg-orange-100 text-orange-700" },
  PARTIALLY_REVIEWED: {
    label: "Partiellement vérifié",
    color: "bg-blue-100 text-blue-700",
  },
  VERIFIED: { label: "Vérifié", color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejeté", color: "bg-red-100 text-red-700" },
  SUSPENDED: { label: "Suspendu", color: "bg-slate-200 text-slate-800" },
};

function getDocStatus(doc: AdminDocument): "approved" | "rejected" | "pending" {
  if (doc.isValid) return "approved";
  if (doc.rejectionReason) return "rejected";
  return "pending";
}

function isImageFile(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function DocumentReviewDrawer({
  profileId,
  onClose,
  onStatusChanged,
}: DocumentReviewDrawerProps) {
  const [data, setData] = useState<TransporterDocumentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectDocId, setRejectDocId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTransporterDocuments(profileId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleApprove = async (docId: number) => {
    setActionLoading(docId);
    try {
      const result = await reviewDocument(docId, "approve");
      // Update local state
      if (data) {
        setData({
          ...data,
          verificationStatus: result.profileStatus,
          documents: data.documents.map((d) =>
            d.id === docId ? result.document : d,
          ),
        });
      }
      onStatusChanged?.();
    } catch (err) {
      alert(
        `Erreur: ${err instanceof Error ? err.message : "Erreur inconnue"}`,
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDocId || !rejectReason.trim()) return;
    setActionLoading(rejectDocId);
    try {
      const result = await reviewDocument(rejectDocId, "reject", rejectReason);
      if (data) {
        setData({
          ...data,
          verificationStatus: result.profileStatus,
          documents: data.documents.map((d) =>
            d.id === rejectDocId ? result.document : d,
          ),
        });
      }
      onStatusChanged?.();
    } catch (err) {
      alert(
        `Erreur: ${err instanceof Error ? err.message : "Erreur inconnue"}`,
      );
    } finally {
      setActionLoading(null);
      setRejectDocId(null);
      setRejectReason("");
    }
  };

  const currentProfileStatus = data?.verificationStatus
    ? profileStatusLabels[data.verificationStatus] || {
        label: data.verificationStatus,
        color: "bg-slate-100 text-slate-600",
      }
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Vérification des documents
              </h2>
              {data && (
                <p className="text-sm text-slate-500">{data.transporterName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-4" />
              <p className="text-slate-500">Chargement des documents...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Data loaded */}
          {data && !loading && (
            <>
              {/* Profile Summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Transporteur</p>
                    <p className="font-semibold text-slate-900">
                      {data.transporterName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {data.transporterEmail}
                    </p>
                  </div>
                  {currentProfileStatus && (
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-medium ${currentProfileStatus.color}`}
                    >
                      {currentProfileStatus.label}
                    </span>
                  )}
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Progression de la vérification</span>
                    <span>
                      {data.documents.filter((d) => d.isValid).length}/
                      {data.documents.length} approuvés
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-green-500 rounded-full h-2 transition-all duration-300"
                      style={{
                        width:
                          data.documents.length > 0
                            ? `${(data.documents.filter((d) => d.isValid).length / data.documents.length) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Empty state */}
              {data.documents.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Aucun document soumis</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Ce transporteur n&apos;a pas encore uploadé de documents
                  </p>
                </div>
              )}

              {/* Document List */}
              {data.documents.map((doc) => {
                const status = getDocStatus(doc);
                const cfg = docStatusConfig[status];
                const StatusIcon = cfg.icon;
                const fileUrl = doc.fileUrl
                  ? doc.fileUrl.startsWith("http")
                    ? doc.fileUrl
                    : `http://localhost:8000${doc.fileUrl}`
                  : "";

                return (
                  <div
                    key={doc.id}
                    className={`border rounded-xl p-4 transition-all ${cfg.bg}`}
                  >
                    {/* Doc Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className={`w-5 h-5 ${cfg.text}`} />
                        <div>
                          <p className="font-medium text-slate-900 text-sm">
                            {doc.documentTypeLabel}
                          </p>
                          <p className="text-xs text-slate-400">
                            Doc #{doc.id} · Soumis le{" "}
                            {new Date(doc.uploadedAt).toLocaleDateString(
                              "fr-FR",
                            )}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.badge}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Preview / View */}
                    {fileUrl && (
                      <div className="mb-3">
                        {isImageFile(fileUrl) ? (
                          <button
                            onClick={() => setPreviewUrl(fileUrl)}
                            className="w-full h-32 bg-white rounded-lg border border-slate-200 overflow-hidden relative group cursor-pointer"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={fileUrl}
                              alt={doc.documentTypeLabel}
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                              <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </button>
                        ) : (
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 text-sm text-primary-600 hover:bg-primary-50 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Voir le document (PDF)
                          </a>
                        )}
                      </div>
                    )}

                    {/* Rejection Reason */}
                    {doc.rejectionReason && (
                      <div className="bg-red-100 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700">
                          {doc.rejectionReason}
                        </p>
                      </div>
                    )}

                    {/* Reviewed By */}
                    {doc.reviewedAt && (
                      <p className="text-xs text-slate-400 mb-3">
                        Vérifié par {doc.reviewedBy || "Admin"} le{" "}
                        {new Date(doc.reviewedAt).toLocaleDateString("fr-FR")}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {status !== "approved" && (
                        <button
                          onClick={() => handleApprove(doc.id)}
                          disabled={actionLoading === doc.id}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approuver
                        </button>
                      )}
                      {status !== "rejected" && (
                        <button
                          onClick={() => setRejectDocId(doc.id)}
                          disabled={actionLoading === doc.id}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Rejeter
                        </button>
                      )}
                      {status === "approved" && (
                        <p className="flex-1 text-center text-sm text-green-600 font-medium py-2">
                          ✓ Document approuvé
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectDocId !== null && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Rejeter le document
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Indiquez la raison du rejet. Le transporteur sera notifié.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Raison du rejet (ex: Document illisible, date expirée...)"
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setRejectDocId(null);
                  setRejectReason("");
                }}
                className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading !== null}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? "En cours..." : "Confirmer le rejet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[80vh]">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Prévisualisation du document"
              className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain"
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
