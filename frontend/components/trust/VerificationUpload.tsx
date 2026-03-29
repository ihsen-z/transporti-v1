import React, { useState } from "react";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/client";

interface VerificationUploadProps {
  documentType:
    | "ID_CARD"
    | "DRIVING_LICENSE"
    | "VEHICLE_REGISTRATION"
    | "INSURANCE";
  label: string;
  onUploadSuccess: () => void;
}

// Map frontend document types to backend DocumentType choices
const DOCUMENT_TYPE_MAP: Record<string, string> = {
  ID_CARD: "CIN_FRONT",
  DRIVING_LICENSE: "LICENSE",
  VEHICLE_REGISTRATION: "CARTE_GRISE",
  INSURANCE: "INSURANCE",
};

export function VerificationUpload({
  documentType,
  label,
  onUploadSuccess,
}: VerificationUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // Client-side pre-validation (5MB max)
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
    if (!file || uploading) return; // Double-click prevention
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append(
        "document_type",
        DOCUMENT_TYPE_MAP[documentType] || documentType,
      );
      formData.append("document_file", file);

      // Use apiClient.upload (correct base URL + JWT auth + multipart)
      await apiClient.upload("/api/trust/documents/", formData);

      setSuccess(true);
      setFile(null);
      onUploadSuccess();
    } catch (err: unknown) {
      console.error("Upload error:", err);

      if (err instanceof ApiError) {
        const body = err.body as Record<string, unknown> | undefined;

        if (err.status === 403) {
          setError(
            "Accès refusé. Vérifiez que vous êtes connecté en tant que transporteur.",
          );
        } else if (err.status === 400 && body) {
          // Extract validation messages
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

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-start mb-2">
        <label className="font-medium text-gray-700 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          {label}
        </label>
        {success && <CheckCircle className="w-5 h-5 text-green-500" />}
      </div>

      {!success ? (
        <div className="space-y-3">
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />

          {file && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Envoyer le document
                  </>
                )}
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {error}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-green-600 flex items-center gap-1">
          <CheckCircle className="w-4 h-4" />
          Document envoyé avec succès.
        </p>
      )}
    </div>
  );
}
