// Cadences de sondage — la seule source. Chaque hook qui interroge le serveur
// à intervalle régulier lit sa cadence ici, pour que le total reste visible
// d'un coup d'œil.
//
// Pourquoi ce fichier existe. L'audit du 10/09 a mesuré que 81 % du trafic de
// l'application était du sondage de fond : conversations toutes les 10 s et
// non-lus toutes les 15 s sur TOUS les écrans, mission toutes les 15 s, fil de
// discussion toutes les 5 s. Le limiteur du serveur (1 000 requêtes par heure
// et par utilisateur, `DEFAULT_THROTTLE_RATES['user']` dans settings.py) a
// fini par refuser 85 requêtes à l'application elle-même.
//
// Ce qui compense des cadences plus lentes :
// - un retour au premier plan rafraîchit aussitôt (`refetchOnWindowFocus`,
//   branché sur AppState dans app/_layout.tsx) ;
// - un push reçu rafraîchit tout de suite ce qu'il concerne
//   (`queriesToRefresh`, appelé par usePushNotifications).
export const POLL_INTERVAL_MS = {
  // Pastilles de la barre d'onglets et de la cloche : visibles partout, donc
  // le sondage le plus coûteux. Une minute suffit pour un badge.
  conversations: 60_000,
  unreadCount: 60_000,
  // Écran de mission ouvert : le transporteur avance (départ, livraison) sans
  // que la cliente touche à rien.
  jobDetail: 30_000,
  // Fil de discussion ouvert : la seule conversation en direct de l'app.
  jobMessages: 8_000,
} as const;

// Limite du serveur, ramenée à la minute (1 000 / 60).
export const SERVER_REQUESTS_PER_MINUTE = 1000 / 60;

// Pire cas : un téléphone sur un fil de discussion, ouvert depuis l'écran de
// mission (qui reste monté dans la pile), barre d'onglets et cloche montées.
// Tous les sondages tournent en même temps.
export function worstCaseRequestsPerMinute(): number {
  return Object.values(POLL_INTERVAL_MS).reduce(
    (total, intervalle) => total + 60_000 / intervalle,
    0,
  );
}
