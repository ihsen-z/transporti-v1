"use client";

import { JobDetailScreen } from "@/components/jobs/JobDetailScreen";

/**
 * Detail d'un TRAJET RETOUR, publie par un transporteur.
 *
 * L'ecran est partage avec /demandes/<id> : le decoupage se fait par nature de
 * job, pas par role du lecteur. Voir lib/routes/jobs.ts pour le pourquoi.
 */
export default function TrajetDetailPage() {
  return <JobDetailScreen nature="trajet" />;
}
