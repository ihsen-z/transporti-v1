'use client';

import React, { useRef, useState } from 'react';
import { Camera, ImagePlus, X, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { compressImage, validateImageFile } from '@/lib/imageUtils';

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
 */
export function PhotoUploader({ photos, onPhotosChange, maxPhotos = 5 }: PhotoUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const remainingSlots = maxPhotos - photos.length;

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setError(null);

        const fileArray = Array.from(files);

        // Check slot limit
        if (fileArray.length > remainingSlots) {
            setError(`Maximum ${maxPhotos} photos. Il reste ${remainingSlots} emplacement(s).`);
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
                formData.append('photo', compressed);

                const result = await apiClient.upload<UploadResponse>(
                    '/api/upload/photo/',
                    formData
                );

                newUrls.push(result.url);
            }

            if (newUrls.length > 0) {
                onPhotosChange([...photos, ...newUrls]);
            }
        } catch (err: any) {
            console.error('Photo upload error:', err);
            setError(err?.body?.error || err?.message || 'Erreur lors de l\'upload.');
        } finally {
            setUploading(false);
            // Reset inputs so the same file can be selected again
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (cameraInputRef.current) cameraInputRef.current.value = '';
        }
    };

    const removePhoto = (index: number) => {
        const updated = photos.filter((_, i) => i !== index);
        onPhotosChange(updated);
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
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

                {/* Gallery button */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || remainingSlots <= 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
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
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploading || remainingSlots <= 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                    <Camera className="w-4 h-4" />
                    Caméra
                </button>

                {uploading && (
                    <span className="text-sm text-gray-500 self-center ml-2">
                        Compression et upload en cours...
                    </span>
                )}
            </div>

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
                            className="relative aspect-square border rounded-lg overflow-hidden bg-gray-50 group"
                        >
                            <img
                                src={photo}
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
                <p className="text-xs text-gray-400">
                    JPEG, PNG ou WebP • Max 5 MB par photo • {maxPhotos} photos maximum
                </p>
            )}
        </div>
    );
}
