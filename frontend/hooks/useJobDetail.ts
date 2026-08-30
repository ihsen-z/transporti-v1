"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { getJobDetail } from "@/lib/services/jobDetail";
import type { JobDetail } from "@/lib/types/jobs";

/** Ce qui a empêché la lecture. `null` tant que rien n'a échoué. */
export type ErreurDeLecture = "network" | "not_found";

export interface EtatDetailTransport {
  transport: JobDetail | null;
  chargement: boolean;
  erreur: ErreurDeLecture | null;
  /** Relit depuis le serveur. Appelé après chaque mutation réussie. */
  relire: () => Promise<void>;
}

/**
 * Lecture du détail d'un transport — lot 4.1.
 *
 * Extrait de `jobs/[id]/page.tsx`, où l'état, l'effet de chargement et la
 * distinction des erreurs vivaient au milieu de douze gestionnaires d'action.
 *
 * Distingue « le transport n'existe pas ou l'accès est refusé » (4xx) d'une
 * panne réseau ou serveur : afficher « introuvable » sur une coupure réseau
 * enverrait le client chercher un transport qui existe pourtant.
 *
 * `jobId` vaut `null` quand le segment d'URL n'est pas un nombre. On ne
 * déclenche alors AUCUN appel — la version en ligne fabriquait
 * `/api/jobs/null/` et attendait la réponse du serveur pour l'apprendre.
 */
export function useJobDetail(jobId: number | null): EtatDetailTransport {
  const [transport, setTransport] = useState<JobDetail | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<ErreurDeLecture | null>(null);

  const relire = useCallback(async () => {
    if (jobId === null) {
      setErreur("not_found");
      setChargement(false);
      return;
    }
    setChargement(true);
    setErreur(null);
    try {
      setTransport(await getJobDetail(jobId));
    } catch (error) {
      console.error("Error fetching job:", error);
      setErreur(
        error instanceof ApiError && error.status >= 400 && error.status < 500
          ? "not_found"
          : "network",
      );
    } finally {
      setChargement(false);
    }
  }, [jobId]);

  useEffect(() => {
    void relire();
  }, [relire]);

  return { transport, chargement, erreur, relire };
}
