"use client";

import React, { useState } from "react";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/client";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type DocumentCategory =
  | "ID_CARD"
  | "DRIVING_LICENSE"
  | "VEHICLE_REGISTRATION"
  | "INSURANCE";

interface VerificationUploadProps {
  category: DocumentCategory;
  label: string;
  onUploadSuccess: () => void;
}

// Map frontend categories to backend recto/verso document_type
const CATEGORY_TO_BACKEND: Record<
  DocumentCategory,
  { front: string; back: string }
> = {
  ID_CARD: { front: "CIN_FRONT", back: "CIN_BACK" },
  DRIVING_LICENSE: { front: "LICENSE_FRONT", back: "LICENSE_BACK" },
  VEHICLE_REGISTRATION: {
    front: "CARTE_GRISE_FRONT",
    back: "CARTE_GRISE_BACK",
  },
  INSURANCE: { front: "INSURANCE_FRONT", back: "INSURANCE_BACK" },
};

/* -------------------------------------------------------------------------- */
/*  Single Side Upload Sub-component                                           */
/* -------------------------------------------------------------------------- */

interface SideUploadProps {
  sideLabel: string;
  backendType: string;
  onUploadSuccess: () => void;
}

function SideUpload({ sideLabel, backendType, onUploadSuccess }: SideUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("Fichier trop volumineux. Maximum autorisé : 5MB.");
        return;
      }

      setFile(selectedFile);
      setError("");
      setSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("document_type", backendType);
      formData.append("document_file", file);

      await apiClient.upload("/api/trust/documents/", formData);

      setSuccess(true);
      setFile(null);
      onUploadSuccess();
    } catch (err: unknown) {
      console.error("Upload error:", err);

      if (err instanceof ApiError) {
        const body = err.body as Record<string, unknown> | undefined;

        if (err.status === 403) {
          setError("Accès refusé. Vérifiez que vous êtes connecté en tant que transporteur.");
        } else if (err.status === 400 && body) {
          const messages: string[] = [];
          for (const [, val] of Object.entries(body)) {
            if (Array.isArray(val)) {
              messages.push(...val.map((v) => String(v)));
            } else if (typeof val === "string") {
              messages.push(val);
            }
          }
          setError(messages.join(" ") || "Erreur de validation du document.");
        } else {
          setError(`Erreur serveur (${err.status}). Veuillez réessayer.`);
        }
      } else {
        setError("Erreur réseau. Vérifiez votre connexion.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setSuccess(false);
    setError("");
  };

  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
        {sideLabel}
      </p>

      {success ? (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span className="text-sm text-green-700 font-medium">Envoyé ✓</span>
          <button
            onClick={handleReset}
            className="ms-auto p-1 rounded text-neutral-400 hover:text-neutral-600 transition-colors"
            title="Remplacer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block cursor-pointer">
            <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              file
                ? "border-brand-600/40 bg-brand-600/5"
                : "border-neutral-200 hover:border-brand-600/30 hover:bg-neutral-50"
            }`}>
              <Upload className={`w-5 h-5 mx-auto mb-1.5 ${file ? "text-brand-600" : "text-neutral-300"}`} />
              <p className="text-xs text-neutral-500">
                {file ? file.name : "Cliquer pour sélectionner"}
              </p>
              {file && (
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>

          {file && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-2 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Envoyer
                </>
              )}
            </button>
          )}

          {error && (
            <p className="text-[10px] text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Component: Recto/Verso Upload                                         */
/* -------------------------------------------------------------------------- */

export function VerificationUpload({
  category,
  label,
  onUploadSuccess,
}: VerificationUploadProps) {
  const mapping = CATEGORY_TO_BACKEND[category];

  return (
    <div className="border rounded-xl p-4 bg-neutral-50">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-brand-600" />
        <span className="font-medium text-neutral-700">{label}</span>
      </div>

      <div className="flex gap-3">
        <SideUpload
          sideLabel="📄 Recto (Face avant)"
          backendType={mapping.front}
          onUploadSuccess={onUploadSuccess}
        />
        <div className="w-px bg-neutral-200 flex-shrink-0" />
        <SideUpload
          sideLabel="📄 Verso (Face arrière)"
          backendType={mapping.back}
          onUploadSuccess={onUploadSuccess}
        />
      </div>
    </div>
  );
}
