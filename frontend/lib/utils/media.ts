/**
 * Centralized media URL helper.
 * Prepends the API base URL to relative media paths.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Returns a full URL for a media file path.
 * - If the path is already a full URL (starts with http), return as-is.
 * - Otherwise, prepend the API base URL.
 */
export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
