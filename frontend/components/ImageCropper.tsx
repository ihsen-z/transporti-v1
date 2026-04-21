"use client";

import React, { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { X, ZoomIn, ZoomOut, Check, RotateCcw } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Canvas util — crop pixels from image                                       */
/* -------------------------------------------------------------------------- */

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputType: "image/jpeg" | "image/png" = "image/jpeg",
  quality = 0.92,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      outputType,
      quality,
    );
  });
}

/* -------------------------------------------------------------------------- */
/*  ImageCropper Modal                                                         */
/* -------------------------------------------------------------------------- */

interface ImageCropperProps {
  /** Data URL or object URL of the image to crop */
  imageSrc: string;
  /** Aspect ratio: 1 for avatar (circle), 16/9 for vehicle */
  aspect: number;
  /** Shape of the crop area */
  cropShape?: "rect" | "round";
  /** Title shown in the modal header */
  title?: string;
  /** Called with the cropped Blob */
  onCrop: (blob: Blob) => void;
  /** Called when user cancels */
  onCancel: () => void;
}

export default function ImageCropper({
  imageSrc,
  aspect,
  cropShape = "rect",
  title = "Recadrer l'image",
  onCrop,
  onCancel,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCrop(croppedBlob);
    } catch (err) {
      console.error("Crop error:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-[95vw] max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 bg-neutral-50">
          <h3 className="text-sm font-bold text-neutral-800">{title}</h3>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg hover:bg-neutral-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {/* Crop area */}
        <div className="relative w-full" style={{ height: 360 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={cropShape === "rect"}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controls */}
        <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50">
          {/* Zoom slider */}
          <div className="flex items-center gap-3 mb-3">
            <ZoomOut className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-brand-600"
            />
            <ZoomIn className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setRotation((r) => (r + 90) % 360);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-100 text-neutral-600 rounded-lg text-xs font-semibold hover:bg-neutral-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Pivoter
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-neutral-600 text-sm font-semibold hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={processing}
                className="inline-flex items-center gap-2 px-5 py-2 bg-accent-600 text-white rounded-xl text-sm font-semibold hover:bg-accent-700 transition-colors shadow-md disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {processing ? "Traitement..." : "Valider"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
