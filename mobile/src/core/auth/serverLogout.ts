import axios from 'axios';
import { env } from '@/core/env';

// Déconnexion côté serveur : `POST auth/logout/` met le jeton de rafraîchissement
// sur liste noire, pour qu'un jeton copié avant la déconnexion ne serve plus.
//
// Au mieux, jamais bloquant : la déconnexion LOCALE (jetons, cache) doit réussir
// même sans réseau ou si le serveur est en panne ou n'expose pas encore la route.
// Cette fonction n'échoue donc jamais — elle avale toute erreur.
//
// Appel « nu » (axios direct) : `apiClient` importe le store d'auth, qui importe
// ce module — passer par lui ferait un cycle, et un 401 ici déclencherait
// l'intercepteur de rafraîchissement en pleine déconnexion.
const LOGOUT_TIMEOUT_MS = 5_000;

export async function revokeRefreshToken(
  refresh: string | null,
  access: string | null,
): Promise<void> {
  if (!refresh) return;
  try {
    await axios.post(
      `${env.apiBaseUrl}/auth/logout/`,
      { refresh },
      {
        timeout: LOGOUT_TIMEOUT_MS,
        headers: access ? { Authorization: `Bearer ${access}` } : undefined,
      },
    );
  } catch {
    // Volontairement ignoré : voir l'en-tête du fichier.
  }
}
