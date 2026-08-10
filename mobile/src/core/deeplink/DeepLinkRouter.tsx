import { useDeepLinkRouting } from './useDeepLinkRouting';

// Monte le routage des liens profonds sans rien rendre.
//
// Composant plutôt qu'appel direct du hook dans le layout racine : le hook a
// besoin du QueryClient (invalidation après vérification du paiement), donc il
// doit vivre SOUS le provider React Query — ce que le layout, qui déclare ce
// provider, ne peut pas faire pour lui-même.
export function DeepLinkRouter(): null {
  useDeepLinkRouting();
  return null;
}
