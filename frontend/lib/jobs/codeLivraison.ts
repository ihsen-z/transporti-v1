/**
 * Logique pure du code de livraison (extraite de JobDetailScreen pour rester
 * lisible ; le site n'a pas de tests unitaires, ces fonctions n'ont aucune
 * dépendance React ni réseau).
 */

/** Photo de preuve déjà téléversée pour un fichier précis. */
export interface PreuveTeleversee {
  fichier: File;
  url: string;
}

/**
 * Rend l'URL de la photo de preuve, en ne téléversant qu'UNE fois par fichier
 * choisi : un essai de code refusé (mauvais code, saisie verrouillée) ne doit
 * pas renvoyer la même photo à chaque tentative.
 *
 * - Pas de fichier : chaîne vide, rien n'est téléversé.
 * - Même fichier que la dernière fois, déjà téléversé : on réutilise l'URL.
 * - Sinon on téléverse ; une URL vide (échec, la preuve est optionnelle) n'est
 *   PAS mémorisée, pour qu'une nouvelle tentative puisse réessayer.
 */
export async function urlPreuveReutilisable(
  fichier: File | null,
  precedent: PreuveTeleversee | null,
  televerser: (fichier: File) => Promise<string>,
): Promise<{ url: string; preuve: PreuveTeleversee | null }> {
  if (!fichier) return { url: "", preuve: null };
  if (precedent && precedent.fichier === fichier && precedent.url) {
    return { url: precedent.url, preuve: precedent };
  }
  const url = await televerser(fichier);
  return { url, preuve: url ? { fichier, url } : null };
}

/** Secondes de verrouillage → minutes affichables (jamais moins de 1). */
export function minutesDeVerrouillage(secondes: number): number {
  return Math.max(1, Math.ceil(secondes / 60));
}
