"use client";

import React, { useState, useEffect } from "react";
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
  MessageSquare,
  ArrowLeft,
  Loader2,
  X,
  FileText,
  ChevronRight,
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
  resolution: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

/* -------------------------------------------------------------------------- */
/*  Status helpers                                                            */
/* -------------------------------------------------------------------------- */

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  OPEN: {
    label: "Ouvert",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
  },
  INVESTIGATING: {
    label: "En investigation",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: SearchIcon,
  },
  RESOLVED: {
    label: "Résolu",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
  },
  REJECTED: {
    label: "Rejeté",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
};

const reasonLabels: Record<string, string> = {
  DAMAGE: "Marchandise endommagée",
  DELAY: "Retard de livraison",
  NO_SHOW: "Transporteur absent",
  OVERCHARGE: "Surfacturation",
  QUALITY: "Qualité du service",
  OTHER: "Autre",
};

/* -------------------------------------------------------------------------- */
/*  Create Dispute Modal                                                      */
/* -------------------------------------------------------------------------- */

function CreateDisputeModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { showToast } = useToast();
  const [jobId, setJobId] = useState("");
  const [reason, setReason] = useState("DAMAGE");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId || !description.trim()) return;

    setSubmitting(true);
    try {
      await apiClient.post("/api/disputes/", {
        job: parseInt(jobId, 10),
        reason,
        description: description.trim(),
      });
      showToast("success", "Litige créé avec succès !");
      onCreated();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.body) {
        const msgs = Object.values(err.body).flat();
        showToast("error", String(msgs[0] || "Erreur lors de la création."));
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
            <Scale className="w-5 h-5" />
            <h2 className="text-lg font-bold">Ouvrir un litige</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              N° de la mission (ID du job)
            </label>
            <input
              type="number"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="Ex: 42"
              className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-600 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Motif du litige
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-600 outline-none"
            >
              {Object.entries(reasonLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Description détaillée
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Décrivez le problème rencontré en détail..."
              className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-600 outline-none resize-none"
              required
            />
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
              disabled={submitting || !jobId || !description.trim()}
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

  const fetchDisputes = async () => {
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
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

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
        {[
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
        ].map((tab) => (
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
                className="bg-white rounded-2xl border border-neutral-100 p-5 hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${config.color}`}
                    >
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-neutral-900">
                          {reasonLabels[dispute.reason] || dispute.reason}
                        </h3>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${config.color}`}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        Mission #{dispute.job} · Créé le{" "}
                        {formatDate(dispute.created_at)}
                      </p>
                      <p className="text-sm text-neutral-600 mt-2 line-clamp-2">
                        {dispute.description}
                      </p>

                      {/* Resolution */}
                      {dispute.resolution && (
                        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <p className="text-xs font-medium text-emerald-800 mb-0.5">
                            Résolution :
                          </p>
                          <p className="text-xs text-emerald-700">
                            {dispute.resolution}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-xs text-neutral-400 flex-shrink-0">
                    #{dispute.id}
                  </span>
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
            Ouvrez un litige en indiquant le numéro de la mission et le motif.
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
        />
      )}
    </div>
  );
}
