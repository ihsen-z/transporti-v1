import type { MyRequestDto, MyRequestStatus } from '../api/dto';

/**
 * C2.1 — les demandes envoyées, triées par QUI DOIT AGIR, pas par date.
 *
 * Jumeau mobile de `ongletDeLaDemande()` (frontend/lib/services/tripRequests.ts).
 * La logique est dupliquée et non partagée : les deux plateformes n'ont pas de
 * paquet commun. Toute évolution doit donc toucher les deux fichiers — c'est
 * l'objet du test de parité qui accompagne ce module.
 *
 * DIFFÉRENCE ASSUMÉE AVEC LE WEB : l'onglet « en cours » n'existe pas ici.
 * Sur le web il est alimenté par les annonces classiques du client
 * (`status === 'IN_PROGRESS'`). Le client mobile n'en publie aucune — son FAB
 * est la recherche, pas la publication — et le statut d'une demande ne passe
 * jamais « en cours » : il reste ACCEPTED une fois le transport engagé. Un
 * cinquième onglet serait donc vide par construction, ce qui revient à mentir
 * sur l'existence d'un état.
 */
export type OngletDemande =
  | 'attente'
  | 'negociation'
  | 'a-payer'
  | 'terminees';

/** Ordre d'affichage : ce qui attend le geste du client d'abord. */
export const ONGLETS_DEMANDES: OngletDemande[] = [
  'attente',
  'negociation',
  'a-payer',
  'terminees',
];

/** Ce qu'attend une demande envoyée, du point de vue du client. */
export function ongletDeLaDemande(
  demande: Pick<MyRequestDto, 'status'>,
): OngletDemande {
  const statut: MyRequestStatus = demande.status;
  switch (statut) {
    case 'PENDING':
      // Le transporteur doit répondre : le client attend.
      return 'attente';
    case 'COUNTERED':
      // Une contre-proposition attend SA décision — l'onglet prioritaire.
      return 'negociation';
    case 'ACCEPTED':
      // Acceptée : le paiement lui revient.
      return 'a-payer';
    default:
      // REJECTED, CANCELLED : plus rien à faire.
      return 'terminees';
  }
}

/** Nombre de demandes par onglet, pour la pastille de comptage. */
export function compterParOnglet(
  demandes: Pick<MyRequestDto, 'status'>[],
): Record<OngletDemande, number> {
  const compteurs: Record<OngletDemande, number> = {
    attente: 0,
    negociation: 0,
    'a-payer': 0,
    terminees: 0,
  };
  for (const demande of demandes) {
    compteurs[ongletDeLaDemande(demande)] += 1;
  }
  return compteurs;
}
