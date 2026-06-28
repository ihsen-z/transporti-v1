"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { apiClient, ApiError } from "@/lib/api/client";
import { useToast } from "@/components/ui/Toast";
import {
  AlertTriangle,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Search as SearchIcon,
  Scale,
  Loader2,
  X,
  ChevronRight,
  MapPin,
  Truck,
  Package,
  FileText,
  MessageCircle,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Dispute {
  id: number;
  job: number;
  reason: string;
  description: string;
  status: string;
  resolution_notes: string | null;
  opened_by_name: string;
  job_summary: {
    id: number;
    type: string;
    status: string;
    pickup?: string;
    dropoff?: string;
  };
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface UserJob {
  id: number;
  job_type: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_governorate?: string;
  dropoff_governorate?: string;
  created_at: string;
}

/* -------------------------------------------------------------------------- */
/*  Status helpers                                                            */
/* -------------------------------------------------------------------------- */

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  OPEN: {
    label: "Ouvert",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    icon: Clock,
  },
  INVESTIGATING: {
    label: "En investigation",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    icon: SearchIcon,
  },
  RESOLVED: {
    label: "Résolu",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50 border-emerald-200",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Rejeté",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    icon: XCircle,
  },
};

// ✅ Aligned with backend Dispute.Reason choices
const reasonLabels: Record<string, string> = {
  DAMAGED_ITEMS: "Marchandise endommagée",
  LATE_DELIVERY: "Retard de livraison",
  NO_SHOW: "Transporteur absent",
  PAYMENT_ISSUE: "Problème de paiement",
  HARASSMENT: "Harcèlement",
  FRAUD: "Fraude suspectée",
  OTHER: "Autre",
};

const jobTypeLabels: Record<string, string> = {
  TRANSPORT: "Transport",
  MOVING: "Déménagement",
  DELIVERY: "Livraison",
};

/* -------------------------------------------------------------------------- */
/*  Create Dispute Modal — Premium + Connected                                */
/* -------------------------------------------------------------------------- */

function CreateDisputeModal({
  onClose,
  onCreated,
  userRole,
}: {
  onClose: () => void;
  onCreated: () => void;
  userRole: string;
}) {
  const { showToast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [userJobs, setUserJobs] = useState<UserJob[]>([]);

  // ✅ P0-03: Fetch only the user's own jobs
  useEffect(() => {
    const fetchUserJobs = async () => {
      setLoadingJobs(true);
      try {
        const isTransporter = userRole?.toUpperCase() === "TRANSPORTER";
        const endpoint = isTransporter
          ? "/api/jobs/transporter/"
          : "/api/jobs/my/";
        const data = await apiClient.get<any>(endpoint);
        const jobs = data.results ?? (Array.isArray(data) ? data : []);

        // Only show jobs that can have disputes (IN_PROGRESS or COMPLETED)
        const eligibleJobs = jobs.filter((j: UserJob) =>
          ["IN_PROGRESS", "COMPLETED", "CONFIRMED"].includes(j.status),
        );
        setUserJobs(eligibleJobs);
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
      } finally {
        setLoadingJobs(false);
      }
    };
    fetchUserJobs();
  }, [userRole]);

  const selectedJob = userJobs.find((j) => j.id === parseInt(selectedJobId));
  const descriptionLength = description.trim().length;
  const isDescriptionValid = descriptionLength >= 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId || !reason || !isDescriptionValid) return;

    setSubmitting(true);
    try {
      // ✅ P0-01: Send job_id (not job)
      // ✅ P0-02: reason codes aligned with backend
      await apiClient.post("/api/disputes/", {
        job_id: parseInt(selectedJobId, 10),
        reason,
        description: description.trim(),
      });
      showToast("success", "Litige créé avec succès !");
      onCreated();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.body) {
        const msgs = Object.values(err.body).flat();
        const msg = String(msgs[0] || "");
        // ✅ P2-06: Translate common backend errors
        if (msg.includes("already has an active dispute")) {
          showToast("error", "Ce job a déjà un litige actif en cours.");
        } else if (msg.includes("not a participant")) {
          showToast(
            "error",
            "Vous ne pouvez signaler que les missions auxquelles vous participez.",
          );
        } else {
          showToast("error", msg || "Erreur lors de la création.");
        }
      } else {
        showToast("error", "Erreur réseau. Veuillez réessayer.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-800 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Ouvrir un litige</h2>
              <p className="text-white/70 text-xs">
                Sélectionnez la mission concernée
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* ✅ P0-03: Dropdown with user's own jobs */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Mission concernée
            </label>
            {loadingJobs ? (
              <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-xl text-sm text-neutral-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement de vos missions...
              </div>
            ) : userJobs.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                <p className="font-medium">Aucune mission éligible</p>
                <p className="text-xs mt-1">
                  Seules les missions en cours ou terminées peuvent faire
                  l'objet d'un litige.
                </p>
              </div>
            ) : (
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-600 outline-none bg-white"
                required
              >
                <option value="">— Sélectionner une mission —</option>
                {userJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    #{job.id} · {jobTypeLabels[job.job_type] || job.job_type} ·{" "}
                    {job.pickup_governorate ||
                      job.pickup_address?.split(",")[0]}{" "}
                    →{" "}
                    {job.dropoff_governorate ||
                      job.dropoff_address?.split(",")[0]}
                  </option>
                ))}
              </select>
            )}

            {/* Selected job preview */}
            {selectedJob && (
              <div className="mt-2 p-3 bg-brand-600/5 border border-brand-600/10 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-neutral-600">
                  <MapPin className="w-3.5 h-3.5 text-brand-600" />
                  <span className="font-medium">
                    {selectedJob.pickup_address}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-600 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-medium">
                    {selectedJob.dropoff_address}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ✅ P0-02: Reason codes aligned with backend */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Motif du litige
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-600 outline-none bg-white"
              required
            >
              <option value="">— Sélectionner un motif —</option>
              {Object.entries(reasonLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* ✅ P2-03: Character counter */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Description détaillée
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Décrivez le problème rencontré en détail (minimum 20 caractères)..."
              className={`w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-600 outline-none resize-none ${
                descriptionLength > 0 && !isDescriptionValid
                  ? "border-red-300 bg-red-50/30"
                  : "border-neutral-300"
              }`}
              required
            />
            <div className="flex justify-between mt-1">
              <span
                className={`text-xs ${
                  descriptionLength > 0 && !isDescriptionValid
                    ? "text-red-500"
                    : "text-neutral-400"
                }`}
              >
                {descriptionLength > 0 && !isDescriptionValid
                  ? `${20 - descriptionLength} caractères restants`
                  : "Minimum 20 caractères"}
              </span>
              <span className="text-xs text-neutral-400">
                {descriptionLength}/2000
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-neutral-300 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={
                submitting || !selectedJobId || !reason || !isDescriptionValid
              }
              className="flex-1 py-3 px-4 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {submitting ? "Envoi..." : "Créer le litige"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Disputes Page                                                             */
/* -------------------------------------------------------------------------- */

export default function DisputesPage() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<any>("/api/disputes/my/");
      const list = data.results ?? (Array.isArray(data) ? data : []);
      setDisputes(list);
    } catch (err) {
      console.error("Error fetching disputes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const filteredDisputes =
    statusFilter === "ALL"
      ? disputes
      : disputes.filter((d) => d.status === statusFilter);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-TN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  // ✅ P1-03: Added REJECTED tab
  const tabs = [
    { id: "ALL", label: "Tous", count: disputes.length },
    {
      id: "OPEN",
      label: "Ouverts",
      count: disputes.filter((d) => d.status === "OPEN").length,
    },
    {
      id: "INVESTIGATING",
      label: "En cours",
      count: disputes.filter((d) => d.status === "INVESTIGATING").length,
    },
    {
      id: "RESOLVED",
      label: "Résolus",
      count: disputes.filter((d) => d.status === "RESOLVED").length,
    },
    {
      id: "REJECTED",
      label: "Rejetés",
      count: disputes.filter((d) => d.status === "REJECTED").length,
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Mes Litiges</h1>
          <p className="text-neutral-500 mt-1 text-sm">
            Suivez et gérez vos réclamations et litiges.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-all hover:shadow-lg hover:shadow-brand-600/20 hover:scale-[1.02]"
        >
          <Plus className="w-5 h-5" />
          Nouveau litige
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              statusFilter === tab.id
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  statusFilter === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-neutral-200 text-neutral-500"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Disputes List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 bg-neutral-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredDisputes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center">
          <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Scale className="w-8 h-8 text-neutral-300" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            {statusFilter === "ALL"
              ? "Aucun litige"
              : "Aucun litige dans cette catégorie"}
          </h3>
          <p className="text-neutral-500 text-sm mb-6">
            {statusFilter === "ALL"
              ? "Vous n'avez pas encore de litiges. Espérons que ça reste ainsi !"
              : "Essayez de changer le filtre."}
          </p>
          {statusFilter === "ALL" && (
            <button
              onClick={() => setShowModal(true)}
              className="text-sm text-brand-600 font-medium hover:text-brand-700"
            >
              Ouvrir un litige →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDisputes.map((dispute) => {
            const config = statusConfig[dispute.status] || statusConfig.OPEN;
            const StatusIcon = config.icon;

            return (
              <div
                key={dispute.id}
                className="bg-white rounded-2xl border border-neutral-100 p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${config.bgColor}`}
                    >
                      <StatusIcon className={`w-5 h-5 ${config.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-neutral-900">
                          {reasonLabels[dispute.reason] || dispute.reason}
                        </h3>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${config.bgColor} ${config.color}`}
                        >
                          {config.label}
                        </span>
                      </div>

                      {/* ✅ P1-02: Clickable job link + P2-04: Show addresses */}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Link
                          href={`/jobs/${dispute.job}`}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline"
                        >
                          Mission #{dispute.job}
                        </Link>
                        <span className="text-xs text-neutral-300">·</span>
                        {dispute.job_summary?.pickup &&
                          dispute.job_summary?.dropoff && (
                            <span className="text-xs text-neutral-500">
                              {dispute.job_summary.pickup.split(",")[0]} →{" "}
                              {dispute.job_summary.dropoff.split(",")[0]}
                            </span>
                          )}
                        <span className="text-xs text-neutral-300">·</span>
                        <span className="text-xs text-neutral-400">
                          {formatDate(dispute.created_at)}
                        </span>
                      </div>

                      <p className="text-sm text-neutral-600 mt-2 line-clamp-2">
                        {dispute.description}
                      </p>

                      {/* Resolution */}
                      {dispute.resolution_notes && (
                        <div
                          className={`mt-3 p-3 rounded-lg border ${
                            dispute.status === "RESOLVED"
                              ? "bg-emerald-50 border-emerald-200"
                              : "bg-red-50 border-red-200"
                          }`}
                        >
                          <p
                            className={`text-xs font-medium mb-0.5 ${
                              dispute.status === "RESOLVED"
                                ? "text-emerald-800"
                                : "text-red-800"
                            }`}
                          >
                            {dispute.status === "RESOLVED"
                              ? "✅ Résolution :"
                              : "❌ Motif du rejet :"}
                          </p>
                          <p
                            className={`text-xs ${
                              dispute.status === "RESOLVED"
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            {dispute.resolution_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ✅ P1-02: Link to job detail */}
                  <Link
                    href={`/jobs/${dispute.job}`}
                    className="flex-shrink-0 p-2 text-neutral-300 hover:text-brand-600 hover:bg-brand-600/5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Voir la mission"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 bg-brand-600/5 border border-brand-600/10 rounded-2xl p-6">
        <h3 className="font-semibold text-neutral-900 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-brand-600" />
          Comment fonctionne la résolution de litiges ?
        </h3>
        <ul className="text-sm text-neutral-600 space-y-2 ml-7">
          <li className="list-disc">
            Ouvrez un litige en sélectionnant la mission et le motif.
          </li>
          <li className="list-disc">
            Notre équipe examine votre réclamation sous 24-48h.
          </li>
          <li className="list-disc">
            Vous serez notifié dès qu&apos;une décision est prise.
          </li>
          <li className="list-disc">
            En cas de résolution favorable, le remboursement est traité sous 3-5
            jours.
          </li>
        </ul>
      </div>

      {/* Create Modal */}
      {showModal && (
        <CreateDisputeModal
          onClose={() => setShowModal(false)}
          onCreated={fetchDisputes}
          userRole={user?.role || "CLIENT"}
        />
      )}
    </div>
  );
}
