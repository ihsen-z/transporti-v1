/**
 * Client-side image compression utility.
 * Resizes images to max dimensions and converts to JPEG for smaller payloads.
 */

const MAX_DIMENSION = 1200; // px — longest side
const JPEG_QUALITY = 0.8;

/**
 * Compress and resize an image File before upload.
 * Returns a new File object ready for FormData.
 */
export async function compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            let { width, height } = img;

            // Resize if too large
            if (Math.max(width, height) > MAX_DIMENSION) {
                const ratio = MAX_DIMENSION / Math.max(width, height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to compress image'));
                        return;
                    }
                    const compressed = new File(
                        [blob],
                        file.name.replace(/\.[^.]+$/, '.jpg'),
                        { type: 'image/jpeg' }
                    );
                    resolve(compressed);
                },
                'image/jpeg',
                JPEG_QUALITY
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

/** Validate file type and size before upload */
export function validateImageFile(file: File): string | null {
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

    if (!ALLOWED_TYPES.includes(file.type)) {
        return `Format non supporté: ${file.type}. Utilisez JPEG, PNG ou WebP.`;
    }
    if (file.size > MAX_SIZE) {
        return `Le fichier "${file.name}" dépasse 5 MB.`;
    }
    return null; // no error
}
