"use client";

import { JobDetailScreen } from "@/components/jobs/JobDetailScreen";

/**
 * Detail d'une DEMANDE classique, publiee par un client.
 *
 * L'ecran est partage avec /trajets/<id> : le decoupage se fait par nature de
 * job, pas par role du lecteur. Voir lib/routes/jobs.ts pour le pourquoi.
 */
export default function DemandeDetailPage() {
  return <JobDetailScreen nature="demande" />;
}
