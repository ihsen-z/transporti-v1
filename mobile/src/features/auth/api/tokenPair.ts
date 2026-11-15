// Paire de jetons éventuellement jointe à une réponse du serveur.
export interface TokenPair {
  access: string;
  refresh: string;
}

// Lit `tokens: {access, refresh}` dans le corps d'une réponse, ou renvoie null
// si le serveur n'en joint pas (ancienne version) ou si la forme est
// inattendue. Fonction pure : on valide la forme au lieu de la supposer.
export function extractTokenPair(data: unknown): TokenPair | null {
  if (typeof data !== 'object' || data === null) return null;
  const tokens = (data as { tokens?: unknown }).tokens;
  if (typeof tokens !== 'object' || tokens === null) return null;
  const { access, refresh } = tokens as { access?: unknown; refresh?: unknown };
  if (typeof access !== 'string' || access === '') return null;
  if (typeof refresh !== 'string' || refresh === '') return null;
  return { access, refresh };
}
