/**
 * Téléversement de photos — lot 4.2.
 *
 * `apiClient` ne parle que JSON pour le reste ; `upload()` est sa porte
 * multipart. Trois écrans y passaient par des chemins différents.
 */
import { apiClient } from "@/lib/api/client";

/** Rend l'URL enregistrée par le serveur. */
export async function uploadPhoto(image: Blob): Promise<string> {
  const corps = new FormData();
  corps.append("photo", image);
  const reponse = await apiClient.upload<{ url: string }>(
    "/api/upload/photo/",
    corps,
  );
  return reponse.url;
}
