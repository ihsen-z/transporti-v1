/**
 * Recherche de trajets retour et alertes corridor — lot 4.2.
 *
 * L'écran `/recherche` construisait ses `URLSearchParams` à la main au milieu
 * du rendu, et lisait la réponse en `any`. Les paramètres du tri, en
 * particulier, étaient traduits par une cascade de `if` : `newest` devenait
 * `-created_at`, et rien ne le disait ailleurs.
 */
import { apiClient } from "@/lib/api/client";
import type { JobFeedItem } from "@/components/jobs/JobFeedCard";

export type TriDesResultats = "newest" | "price_asc" | "price_desc";

/** Traduction du tri de l'interface vers le paramètre `ordering` de l'API. */
const ORDERING: Record<TriDesResultats, string> = {
  newest: "-created_at",
  price_asc: "price_tnd_min",
  price_desc: "-price_tnd_min",
};

export interface CriteresDeRecherche {
  pickup_governorate?: string;
  dropoff_governorate?: string;
  page: number;
  pageSize: number;
  tri: TriDesResultats;
}

export interface ResultatsDeRecherche {
  trajets: JobFeedItem[];
  total: number;
}

/**
 * Trajets retour publiés correspondant aux critères.
 *
 * NOTE DE DETTE : le type des trajets reste `JobFeedItem`, dont l'index est
 * permissif — voir le commentaire de `JobFeedCard`. Le durcir fait tomber une
 * cascade d'erreurs sur une quinzaine de champs et mérite son propre chantier.
 *
 * L'API peut répondre une page paginée ou un tableau nu. Dans le second cas,
 * la pagination est faite ici, comme le faisait l'écran.
 */
export async function searchReturnTrips(
  criteres: CriteresDeRecherche,
): Promise<ResultatsDeRecherche> {
  const parametres = new URLSearchParams({
    is_return_trip: "true",
    page: String(criteres.page),
    page_size: String(criteres.pageSize),
    ordering: ORDERING[criteres.tri],
  });
  if (criteres.pickup_governorate)
    parametres.append("pickup_governorate", criteres.pickup_governorate);
  if (criteres.dropoff_governorate)
    parametres.append("dropoff_governorate", criteres.dropoff_governorate);

  const reponse = await apiClient.get<
    { results?: JobFeedItem[]; count?: number } | JobFeedItem[]
  >(`/api/jobs/public/?${parametres.toString()}`);

  if (Array.isArray(reponse)) {
    const debut = (criteres.page - 1) * criteres.pageSize;
    return {
      trajets: reponse.slice(debut, debut + criteres.pageSize),
      total: reponse.length,
    };
  }
  const trajets = reponse.results ?? [];
  return { trajets, total: reponse.count ?? trajets.length };
}

export interface AlerteCorridor {
  id: number;
  pickup_governorate: string;
  dropoff_governorate: string;
}

/**
 * Les alertes corridor du client.
 *
 * Rend une liste vide en cas d'échec : le bloc des alertes est facultatif sur
 * l'écran de recherche, et son absence ne doit pas priver le client des
 * résultats.
 */
export async function getCorridorAlerts(): Promise<AlerteCorridor[]> {
  try {
    const reponse = await apiClient.get<{ results?: AlerteCorridor[] }>(
      "/api/corridor-alerts/",
    );
    return reponse.results ?? [];
  } catch {
    return [];
  }
}

export function createCorridorAlert(
  depart: string,
  arrivee: string,
): Promise<unknown> {
  return apiClient.post("/api/corridor-alerts/", {
    pickup_governorate: depart,
    dropoff_governorate: arrivee,
  });
}

export function deleteCorridorAlert(id: number): Promise<unknown> {
  return apiClient.delete(`/api/corridor-alerts/${id}/`);
}
