// Missions du transporteur — couche service du domaine (T1.1, lot 1).
//
// Séparé de `returnTrips.ts` : un trajet retour est une offre de capacité que
// le transporteur publie, une mission est un transport qu'il exécute. Les deux
// vivent sur le même agrégat `TransportJob` côté backend, mais ce sont deux
// objets métier distincts et le lot 4 devra les séparer côté vues.

import { apiClient } from "@/lib/api/client";
import type { PaginatedResponse } from "./types";

/** Une mission assignée, telle que renvoyée par TransporterMissionSerializer. */
export interface Mission {
  id: number;
  status:
    | "PUBLISHED"
    | "MATCHED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "DISPUTED";
  pickup_governorate: string;
  pickup_address: string;
  dropoff_governorate: string;
  dropoff_address: string;
  scheduled_time: string;
  is_return_trip: boolean;
  updated_at: string;
}

/**
 * La mission livrée la plus récente — celle dont le transporteur rentre.
 *
 * Alimente l'amorce de retour à vide sur le hub (T1.1), pour rattraper le
 * transporteur qui n'a pas agi depuis l'écran de mission (T4.4).
 *
 * `?type=assigned` est indispensable : sans lui, l'endpoint renvoie l'union des
 * missions et des retours publiés, paginée à 20 — c'est le bug 5.1 déjà
 * documenté dans le mobile. On écarte en plus les trajets retour, qui ne sont
 * pas des missions exécutées.
 *
 * Retourne null plutôt que de lever : l'amorce est un bonus, son absence ne
 * doit jamais casser le tableau de bord.
 */
export async function getLatestCompletedMission(): Promise<Mission | null> {
  try {
    const reponse = await apiClient.get<PaginatedResponse<Mission> | Mission[]>(
      "/api/jobs/transporter/?type=assigned",
    );
    const liste = Array.isArray(reponse) ? reponse : (reponse.results ?? []);

    const livrees = liste
      .filter((m) => m.status === "COMPLETED" && !m.is_return_trip)
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );

    return livrees[0] ?? null;
  } catch {
    return null;
  }
}
