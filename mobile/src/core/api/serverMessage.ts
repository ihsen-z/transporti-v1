// Extraction du message d'erreur rédigé par le serveur.
//
// Le backend répond ses refus en français, et souvent avec un chiffre que le
// mobile ne connaît pas (montant minimum de retrait, plafond du paiement à la
// livraison, solde disponible). Le reformuler côté mobile ferait deux sources
// pour une même règle, qui divergeraient au premier changement de seuil.
//
// Ce module existait déjà, en local, dans `features/wallet/api/useCreateWithdrawal.ts`
// (`firstFieldError`) avec la bonne justification en commentaire. La recette du
// 03/09 a montré ce que coûte de ne pas l'avoir généralisé : l'envoi d'une
// demande repliait tout refus sur un message unique parlant du plafond COD,
// alors que la cause réelle était une description vide.
//
// Trois formes de corps d'erreur circulent :
//   `{"error": "…"}`               règle métier d'une vue APIView
//   `{"detail": "…"}`              refus DRF génériques (permission, méthode)
//   `{"champ": ["…"], …}`          validation de sérialiseur
//
// Un 400 sans corps JSON exploitable existe aussi : Django répond une page
// HTML sur DisallowedHost. On renvoie alors `null` plutôt que d'afficher du
// balisage à l'utilisateur.

function premierTexte(valeur: unknown): string | null {
  if (typeof valeur === 'string') return valeur.trim() || null;
  if (Array.isArray(valeur)) {
    const premier = valeur.find((v) => typeof v === 'string' && v.trim());
    return typeof premier === 'string' ? premier.trim() : null;
  }
  return null;
}

/**
 * Renvoie le message du serveur affichable tel quel, ou `null` si le corps
 * n'en porte aucun.
 *
 * L'ordre de lecture n'est pas arbitraire : `error` et `detail` sont des
 * décisions métier, une erreur de champ n'est qu'une valeur à corriger.
 */
export function extractServerMessage(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
  const corps = data as Record<string, unknown>;

  const metier = premierTexte(corps.error) ?? premierTexte(corps.detail);
  if (metier) return metier;

  const global = premierTexte(corps.non_field_errors);
  if (global) return global;

  for (const valeur of Object.values(corps)) {
    const texte = premierTexte(valeur);
    if (texte) return texte;
  }
  return null;
}
