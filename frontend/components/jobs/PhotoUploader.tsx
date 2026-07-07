"use client";

import React, { useRef, useState, useCallback } from "react";
import { Camera, ImagePlus, X, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { compressImage, validateImageFile, getMediaUrl } from "@/lib/imageUtils";

interface PhotoUploaderProps {
  /** Current list of photo URLs */
  photos: string[];
  /** Callback when photos change (receives the new full array of URLs) */
  onPhotosChange: (photos: string[]) => void;
  /** Max number of photos allowed */
  maxPhotos?: number;
}

interface UploadResponse {
  url: string;
  filename: string;
  size: number;
  dimensions: number[];
}

/**
 * Shared photo upload component with camera, gallery, compression, and upload.
 * Works for both Transport and Moving job forms.
 * Camera button uses navigator.mediaDevices on desktop, capture attribute on mobile.
 */
export function PhotoUploader({
  photos,
  onPhotosChange,
  maxPhotos = 5,
}: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const remainingSlots = maxPhotos - photos.length;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const fileArray = Array.from(files);

    // Check slot limit
    if (fileArray.length > remainingSlots) {
      setError(
        `Maximum ${maxPhotos} photos. Il reste ${remainingSlots} emplacement(s).`,
      );
      return;
    }

    setUploading(true);

    try {
      const newUrls: string[] = [];

      for (const file of fileArray) {
        // Validate
        const validationError = validateImageFile(file);
        if (validationError) {
          setError(validationError);
          continue;
        }

        // Compress
        const compressed = await compressImage(file);

        // Upload
        const formData = new FormData();
        formData.append("photo", compressed);

        const result = await apiClient.upload<UploadResponse>(
          "/api/upload/photo/",
          formData,
        );

        newUrls.push(result.url);
      }

      if (newUrls.length > 0) {
        onPhotosChange([...photos, ...newUrls]);
      }
    } catch (err: any) {
      console.error("Photo upload error:", err);
      setError(err?.body?.error || err?.message || "Erreur lors de l'upload.");
    } finally {
      setUploading(false);
      // Reset inputs so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(updated);
  };

  // --- Camera via getUserMedia (works on desktop & mobile browsers) ---
  const stopCameraStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  }, [stream]);

  const openCamera = async () => {
    setError(null);

    // On mobile: use the native file input with capture attribute
    // Check if this is a mobile device via touch support
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      cameraInputRef.current?.click();
      return;
    }

    // On desktop: use getUserMedia to access camera
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(mediaStream);
      setShowCamera(true);

      // Wait for video element to mount then attach stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError") {
        setError("Accès à la caméra refusé. Vérifiez les permissions de votre navigateur.");
      } else if (err.name === "NotFoundError") {
        setError("Aucune caméra détectée sur cet appareil.");
      } else {
        setError("Impossible d'accéder à la caméra. Utilisez la galerie.");
      }
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    // Convert canvas to blob
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setError("Erreur lors de la capture.");
          return;
        }

        // Stop camera
        stopCameraStream();

        // Create a File from the blob
        const file = new File([blob], `camera_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        // Use the same upload pipeline
        const fakeFileList = {
          length: 1,
          item: (i: number) => (i === 0 ? file : null),
          [Symbol.iterator]: function* () {
            yield file;
          },
          0: file,
        } as unknown as FileList;

        await handleFiles(fakeFileList);
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-neutral-700">
        Photos ({photos.length}/{maxPhotos})
      </label>

      {/* Action buttons */}
      <div className="flex gap-2">
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Gallery button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || remainingSlots <= 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600/5 text-brand-600 rounded-lg hover:bg-brand-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ImagePlus className="w-4 h-4" />
          )}
          Galerie
        </button>

        {/* Camera button */}
        <button
          type="button"
          onClick={openCamera}
          disabled={uploading || remainingSlots <= 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          <Camera className="w-4 h-4" />
          Caméra
        </button>

        {uploading && (
          <span className="text-sm text-neutral-500 self-center ml-2">
            Compression et upload en cours...
          </span>
        )}
      </div>

      {/* Camera viewfinder (desktop) */}
      {showCamera && (
        <div className="relative rounded-xl overflow-hidden border-2 border-brand-600 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-h-[400px] object-contain"
          />
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-3">
            {/* Capture button */}
            <button
              type="button"
              onClick={capturePhoto}
              className="w-14 h-14 rounded-full bg-white border-4 border-brand-600 shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
              title="Prendre la photo"
            >
              <Camera className="w-6 h-6 text-brand-600" />
            </button>
            {/* Cancel button */}
            <button
              type="button"
              onClick={stopCameraStream}
              className="w-10 h-10 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors flex items-center justify-center self-center"
              title="Fermer la caméra"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Photo previews */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="relative aspect-square border rounded-lg overflow-hidden bg-neutral-50 group"
            >
              <img
                src={getMediaUrl(photo)}
                alt={`Photo ${index + 1}`}
                className="object-cover w-full h-full"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                title="Supprimer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Helper text */}
      {remainingSlots > 0 && photos.length === 0 && (
        <p className="text-xs text-neutral-400">
          JPEG, PNG ou WebP • Max 5 MB par photo • {maxPhotos} photos maximum
        </p>
      )}
    </div>
  );
}
