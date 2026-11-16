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
  // Listes de travail, sans push : une minute, comme les pastilles.
  receivedRequests: 60_000, // transporteur : demandes à décider
  myMissions: 60_000, // transporteur : missions actives
  myRequests: 60_000, // cliente : suivi de ses demandes
} as const;

// Sondages propres à un rôle : une même personne n'est jamais cliente ET
// transporteur, ils ne tournent donc pas ensemble.
const CLIENT_ONLY: readonly (keyof typeof POLL_INTERVAL_MS)[] = ['myRequests'];
const TRANSPORTER_ONLY: readonly (keyof typeof POLL_INTERVAL_MS)[] = [
  'receivedRequests',
  'myMissions',
];

// Limite du serveur, ramenée à la minute (1 000 / 60).
export const SERVER_REQUESTS_PER_MINUTE = 1000 / 60;

function perMinute(cles: readonly (keyof typeof POLL_INTERVAL_MS)[]): number {
  return cles.reduce((total, cle) => total + 60_000 / POLL_INTERVAL_MS[cle], 0);
}

// Pire cas : un téléphone sur un fil de discussion, ouvert depuis l'écran de
// mission (qui reste monté dans la pile), barre d'onglets et cloche montées,
// plus les listes de son rôle. Tous les sondages tournent en même temps.
//
// Recalcul (requêtes par minute) :
//   communs     conversations 1 + non-lus 1 + mission 2 + fil 7,5 = 11,5
//   transporteur  + demandes reçues 1 + missions 1               = 13,5  <- pire cas
//   cliente       + mes demandes 1                               = 12,5
// 13,5 reste sous les 16,7 du serveur, et laisse ~3 requêtes par minute aux
// gestes de l'utilisateur. Chaque sondage de liste vaut une requête tant que
// la liste tient dans une page de 20 (`fetchAllPages` en enchaîne davantage au
// delà) ; le calcul suppose donc des listes ordinaires.
export function worstCaseRequestsPerMinute(): number {
  const communs = (Object.keys(POLL_INTERVAL_MS) as (keyof typeof POLL_INTERVAL_MS)[]).filter(
    (cle) => !CLIENT_ONLY.includes(cle) && !TRANSPORTER_ONLY.includes(cle),
  );
  return perMinute(communs) + Math.max(perMinute(CLIENT_ONLY), perMinute(TRANSPORTER_ONLY));
}
