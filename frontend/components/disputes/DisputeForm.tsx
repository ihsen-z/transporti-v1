import React, { useState } from "react";
import { AlertTriangle, Send, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { apiClient, ApiError } from "@/lib/api/client";

// ✅ Aligned with backend Dispute.Reason choices
const REASON_OPTIONS = [
  { value: "DAMAGED_ITEMS", label: "Marchandise endommagée" },
  { value: "LATE_DELIVERY", label: "Retard de livraison" },
  { value: "NO_SHOW", label: "Transporteur absent" },
  { value: "PAYMENT_ISSUE", label: "Problème de paiement" },
  { value: "HARASSMENT", label: "Harcèlement" },
  { value: "FRAUD", label: "Fraude suspectée" },
  { value: "OTHER", label: "Autre" },
];

interface DisputeFormProps {
  jobId: number;
  onClose: () => void;
}

export function DisputeForm({ jobId, onClose }: DisputeFormProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const descriptionLength = description.trim().length;
  const isDescriptionValid = descriptionLength >= 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !isDescriptionValid) return;

    setLoading(true);
    try {
      // ✅ P1-04: Send job_id (not job) — aligned with backend serializer
      await apiClient.post("/api/disputes/", {
        job_id: jobId,
        reason,
        description: description.trim(),
      });

      showToast(
        "success",
        "Votre signalement a été enregistré. Le support vous contactera sous 24h.",
      );
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.body) {
        const msgs = Object.values(error.body).flat();
        const msg = String(msgs[0] || "");

        if (msg.includes("already has an active dispute")) {
          showToast("error", "Ce job a déjà un litige actif en cours.");
        } else if (msg.includes("not a participant")) {
          showToast(
            "error",
            "Vous ne pouvez signaler que vos propres missions.",
          );
        } else {
          showToast("error", msg || "Erreur lors de l'envoi.");
        }
      } else {
        showToast("error", "Erreur réseau. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-bold">Signaler un problème</h2>
              <p className="text-white/70 text-xs">Mission #{jobId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Type de problème
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 border border-neutral-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
              required
            >
              <option value="">— Sélectionner —</option>
              {REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Description détaillée
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full p-3 border rounded-xl text-sm h-32 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none ${
                descriptionLength > 0 && !isDescriptionValid
                  ? "border-red-300 bg-red-50/30"
                  : "border-neutral-300"
              }`}
              placeholder="Décrivez le problème rencontré (minimum 20 caractères)..."
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !reason || !isDescriptionValid}
              className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {loading ? "Envoi..." : "Envoyer le signalement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
