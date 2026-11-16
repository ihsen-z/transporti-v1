/**
 * Routes fermées par un interrupteur de la plateforme, et où elles mènent.
 *
 * Source unique lue par middleware.ts (la redirection) et par les tests de
 * routage (e2e/interrupteurs-routage.spec.ts). Module pur : aucun import React ni HTTP.
 *
 * On ferme les ENTRÉES, jamais la consultation : /demandes/<id> (le détail
 * d'une mission classique déjà engagée) reste ouvert, comme la messagerie,
 * les litiges et les avis.
 */
import type { PlatformConfig } from "./config";

/** Interrupteur dont dépend une route. */
type Interrupteur = keyof Pick<
  PlatformConfig,
  "classic_channel_enabled" | "online_payment_enabled"
>;

export interface RouteFermee {
  /** Chemin exact (sans paramètre). */
  chemin: string;
  interrupteur: Interrupteur;
  /** Équivalent du canal trajet retour (ou du tableau de bord admin). */
  destination: string;
  /** Paramètres de recherche recopiés vers la destination. */
  parametresConserves?: readonly string[];
}

export const ROUTES_FERMEES: readonly RouteFermee[] = [
  // Client : « publier une demande » -> chercher un trajet retour, sur le
  // même itinéraire s'il était déjà choisi.
  {
    chemin: "/demandes/nouvelle",
    interrupteur: "classic_channel_enabled",
    destination: "/recherche",
    parametresConserves: ["pickup_governorate", "dropoff_governorate"],
  },
  // Transporteur : « voir les demandes » (fil des demandes classiques, réservé
  // aux transporteurs) -> les demandes reçues sur ses trajets retour.
  {
    chemin: "/demandes",
    interrupteur: "classic_channel_enabled",
    destination: "/demandes-recues",
  },
  // Transporteur : « mes offres » (offres sur des demandes classiques).
  {
    chemin: "/mes-offres",
    interrupteur: "classic_channel_enabled",
    destination: "/demandes-recues",
  },
  // Back-office : séquestres à libérer ou rembourser.
  {
    chemin: "/admin/payments",
    interrupteur: "online_payment_enabled",
    destination: "/admin/dashboard",
  },
];

/** Normalise un chemin (barre finale retirée) pour la comparaison. */
function cheminNu(chemin: string): string {
  return chemin.length > 1 ? chemin.replace(/\/+$/, "") : chemin;
}

/**
 * Destination de redirection si `chemin` est fermé par `config`, sinon null.
 * `recherche` est la chaîne de requête d'origine (avec ou sans « ? »).
 */
export function destinationSiFermee(
  chemin: string,
  recherche: string,
  config: PlatformConfig,
): string | null {
  const route = ROUTES_FERMEES.find((r) => r.chemin === cheminNu(chemin));
  if (!route || config[route.interrupteur]) return null;

  const source = new URLSearchParams(recherche);
  const cible = new URLSearchParams();
  for (const nom of route.parametresConserves ?? []) {
    const valeur = source.get(nom);
    if (valeur) cible.set(nom, valeur);
  }
  const requete = cible.toString();
  return requete ? `${route.destination}?${requete}` : route.destination;
}
