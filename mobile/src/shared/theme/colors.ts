// Palette officielle Transporti — charte « verre & lumière ».
// Rôle des couleurs — non négociable :
//   BLEU   = structure / identité / hiérarchie
//   ORANGE = le CTA UNIQUE d'un écran
//   VERT   = la valeur (remise, vérifié, gain)
//
// Les CLÉS de ce fichier ne bougent pas : 117 fichiers les importent. Ce sont
// les VALEURS qui ont été alignées sur la charte, pour que chaque écran hérite
// du nouveau rendu sans être réécrit. L'échelle `brand` reste numérotée à
// l'envers de la charte (brand[600] = --blue-700) — la renommer aurait été un
// changement mécanique de 117 fichiers pour zéro gain visuel.
export const colors = {
  // Royal Blue — structure & marque
  brand: {
    50: '#eef2ff', // = --info-bg : fond des bandeaux d'information
    100: '#dce4fd',
    500: '#2563B3', // --blue-600 : liens, accents secondaires, milieu du dégradé
    600: '#1E3A8A', // --blue-700 : bleu royal principal
    800: '#16307A', // --blue-800 : départ du dégradé d'onboarding
    900: '#0E2058', // --blue-900 : fin de dégradé, encre très foncée
  },
  // Vert — valeur / confiance
  green: {
    50: '#ECFDF5', // fond des tags de valeur
    300: '#8FF0B6', // --green-300 : texte vert POSÉ SUR le bleu
    500: '#2FAC55', // --green-500 : le vert de la flèche du logo
    600: '#2FAC55', // alias historique (bouton accent, badge remise)
    700: '#059669', // teinte foncée : icônes, traits
    logo: '#2FAC55',
  },
  // Orange — CTA unique
  cta: {
    50: '#fff7ed',
    500: '#F97316', // --orange-500
    600: '#EA6A0C', // --orange-600 : état pressé / survol
  },
  // États
  success: '#2FAC55',
  warning: '#f59e0b',
  error: '#ef4444',
  errorBorder: '#fecaca',
  // Neutres (gris) — colonne « clair » de la charte
  neutral: {
    0: '#FFFFFF', // --surface
    50: '#F6F8FC', // --bg-app : fond des écrans applicatifs
    100: '#EEF2F8', // squelettes de chargement, tags gris
    200: '#E6EBF3', // --border : séparateurs
    300: '#E4E9F2', // bordure de champ
    400: '#9AA3B2', // --ink-300 : texte tertiaire, prix barré
    500: '#6B7280', // --ink-500 : texte secondaire
    700: '#374151',
    900: '#111827', // --ink-900 : titres
  },
  // Bordure marquée : boutons `outline` sur fond clair (--border-strong).
  borderStrong: '#D5DBE6',
  // Bandeau d'information sur fond clair (--info-bg / --info-ink). 5,60:1.
  info: { bg: '#EEF2FF', ink: '#3B5FA4' },
  // Neutres additionnels pour tags/slate.
  //
  // La charte donne #6B7280 comme encre des tags gris. Mesuré sur son propre
  // fond #EEF2F8 : 4,30:1, sous le seuil AA — et un tag est écrit en 11,5 px.
  // #475569 est la même famille, un cran plus foncé, à 6,75:1.
  slate: '#475569',
  tagBg: '#EEF2F8',

  // ── Blancs cassés POSÉS SUR LE BLEU ──────────────────────────────────
  // La charte les nomme --on-blue-*. Ils ne servent QUE sur le dégradé bleu
  // ou sur une carte de verre ; sur fond clair ils sont illisibles.
  onBlue: {
    100: '#FFFFFF',
    200: '#DBE6FB',
    300: '#CBD9F5', // titres et libellés ≥ 18 px, icônes — voir text.onBlue
  },

  // ── Variantes TEXTE ──────────────────────────────────────────────────
  // Les couleurs ci-dessus restent celles des fonds, des liserés et des
  // icônes. Mais sous 18 px, cinq d'entre elles passaient sous le seuil AA
  // de WCAG 2.1 (4,5:1) — et c'étaient précisément les blocs qui portent la
  // promesse commerciale, mesurés en recette du 03/09 :
  //
  //   amorce de retour à vide   cta[600] sur cta[50]      3,35:1
  //   économie estimée          green[700] sur green[50]  3,60:1
  //   km à vide valorisés       green[700] sur green[50]  3,60:1
  //   expiration urgente        warning sur blanc         2,15:1
  //   « Expiré », « Dépublier » error sur blanc           3,76:1
  //
  // Un chiffre d'économie qu'on ne lit pas au soleil, dans une cabine, ne
  // convertit pas. Ces valeurs sont le même ton un cran plus foncé : la teinte
  // ne change pas, l'identité de la charte est préservée.
  //
  // `onBlue` relève du même défaut, cette fois signalé par la charte
  // elle-même (« vérifier le contraste de #CBD9F5 sur #2563B3 ») : mesuré,
  // il vaut 4,21:1 — sous le seuil. #DCE7FB est le même bleu pâle éclairci
  // jusqu'à 4,80:1 sur le milieu du dégradé, donc conforme sur toute sa
  // longueur puisque le dégradé ne fait que s'assombrir ensuite.
  //
  // Ratios obtenus (garde-fou vérifié par colors.test.ts) :
  //   green   5,24 sur green[50]  ·  5,48 sur blanc
  //   cta     4,88 sur cta[50]
  //   warning 5,02 sur blanc
  //   error   4,83 sur blanc      ·  4,54 sur neutral[50]
  //   onBlue  4,80 sur brand[500]
  text: {
    green: '#047857',
    cta: '#c2410c',
    warning: '#b45309',
    error: '#dc2626',
    onBlue: '#DCE7FB',
    // Mêmes messages, posés sur le dégradé bleu. Le rouge et le vert de la
    // colonne « clair » y tombent à ~1,5:1 : sur du bleu il faut monter en
    // clarté, pas descendre. Mesurés sur brand[500], le stop le plus clair
    // donc le pire cas : 4,70:1 et 4,69:1.
    errorOnBlue: '#FFDCDC',
    greenOnBlue: '#A6F5C6',
  },
} as const;

// Dégradés (expo-linear-gradient). Tuples de couleurs.
//
// La charte les écrit en CSS (`linear-gradient(155deg, …)`). React Native n'a
// pas d'angle : il a un vecteur `start`/`end` en fractions de la boîte. Sur un
// écran de téléphone (≈ 390 × 844), 155° tombe presque exactement sur la
// diagonale coin à coin — d'où `start {0,0}` / `end {1,1}` dans
// ImmersiveScreen. Le calcul est dans ce fichier pour qu'on n'ait pas à le
// refaire : dx/dy = tan(180° − 155°) = 0,466 en pixels, soit
// Δx/Δy = 0,466 × 844/390 ≈ 1,01 en fractions.
export const gradients = {
  // Fond immersif : login, inscription, onboarding, OTP.
  immersive: ['#1E3A8A', '#2563B3', '#0F2461'] as const,
  // Variante onboarding — plus sombre, moins « produit », plus « accueil ».
  onboarding: ['#16307A', '#1E3A8A', '#0E2058'] as const,
  // Hero et avatars sur fond clair : deux stops suffisent.
  brand: ['#1E3A8A', '#2563B3'] as const,
};
