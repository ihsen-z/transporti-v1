/**
 * Carnet d'adresses — lot 6, C5.9.
 *
 * Les lieux qu'un utilisateur réutilise. Publier une demande ou un trajet
 * retour impose sinon de ressaisir à chaque fois l'adresse, son gouvernorat et
 * ses coordonnées.
 *
 * Ouvert aux DEUX rôles : les vues portent `IsAuthenticated` seul, le carnet
 * étant cloisonné par utilisateur et non par rôle. Un transporteur saisit
 * exactement les mêmes champs en publiant un trajet retour.
 */
import { apiClient } from "@/lib/api/client";

export interface AdresseEnregistree {
  id: number;
  label: string;
  address: string;
  governorate: string;
  /**
   * Coordonnées NULLABLES, comme sur un transport : un lieu peut n'être connu
   * que par son gouvernorat, et l'estimation de prix retombe alors sur les
   * centroïdes. Le backend refuse en revanche une latitude sans longitude.
   */
  lat: string | null;
  lng: string | null;
  created_at: string;
  updated_at: string;
}

/** Ce qu'un formulaire envoie. `id` et les dates sont posés par le serveur. */
export type AdresseAEnregistrer = Pick<
  AdresseEnregistree,
  "label" | "address" | "governorate"
> & {
  lat?: string | null;
  lng?: string | null;
};

export async function getAdresses(): Promise<AdresseEnregistree[]> {
  const reponse = await apiClient.get<
    AdresseEnregistree[] | { results?: AdresseEnregistree[] }
  >("/api/addresses/");
  return Array.isArray(reponse) ? reponse : (reponse.results ?? []);
}

export function creerAdresse(
  champs: AdresseAEnregistrer,
): Promise<AdresseEnregistree> {
  return apiClient.post<AdresseEnregistree>("/api/addresses/", champs);
}

export function modifierAdresse(
  id: number,
  champs: Partial<AdresseAEnregistrer>,
): Promise<AdresseEnregistree> {
  return apiClient.patch<AdresseEnregistree>(`/api/addresses/${id}/`, champs);
}

export function supprimerAdresse(id: number): Promise<unknown> {
  return apiClient.delete(`/api/addresses/${id}/`);
}
