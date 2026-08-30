// Géométrie des icônes — données pures, aucune dépendance React.
//
// Pourquoi ce fichier existe : `@expo/vector-icons` rend ses glyphes avec des
// POLICES (.ttf). L'APK de debug n'embarquait aucune des 19 polices attendues,
// donc toutes les icônes étaient invisibles — un bug d'empaquetage, pas de code.
// Ici la géométrie vit dans le bundle JS et est rendue en SVG : il n'y a plus
// de fichier à embarquer, donc plus de mode de défaillance.
//
// Famille : Lucide (même famille que le `lucide-react` du frontend web, ce qui
// aligne mobile et web sur un seul vocabulaire visuel).
// Convention Lucide : viewBox 24×24, trait 2, extrémités et jointures rondes,
// aucun remplissage. Ne pas ajouter de glyphe d'une autre famille ici.

// Un glyphe est une liste de formes. Le format tagué évite de convertir
// cercles et rectangles en chemins à la main (source d'erreurs silencieuses).
export type Shape =
  | { path: string } // <Path d="…" />
  | { circle: [cx: number, cy: number, r: number] }
  | { rect: [x: number, y: number, w: number, h: number, rx: number] }
  | { polyline: string }; // <Polyline points="…" />

export const GLYPHS = {
  // ── Navigation / onglets ────────────────────────────────────────────────
  house: [
    { path: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' },
    {
      path: 'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    },
  ],
  search: [{ circle: [11, 11, 8] }, { path: 'm21 21-4.3-4.3' }],
  compass: [
    {
      path: 'm16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z',
    },
    { circle: [12, 12, 10] },
  ],
  inbox: [
    { path: 'M22 12h-6l-2 3h-4l-2-3H2' },
    {
      path: 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
    },
  ],
  'message-circle': [{ path: 'M7.9 20A9 9 0 1 0 4 16.1L2 22z' }],
  user: [
    { path: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' },
    { circle: [12, 7, 4] },
  ],
  wallet: [
    {
      path: 'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1',
    },
    { path: 'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4' },
  ],

  // ── Actions ────────────────────────────────────────────────────────────
  plus: [{ path: 'M5 12h14' }, { path: 'M12 5v14' }],
  'circle-plus': [
    { circle: [12, 12, 10] },
    { path: 'M8 12h8' },
    { path: 'M12 8v8' },
  ],
  x: [{ path: 'M18 6 6 18' }, { path: 'm6 6 12 12' }],
  check: [{ path: 'M20 6 9 17l-5-5' }],
  'circle-check': [{ circle: [12, 12, 10] }, { path: 'm9 12 2 2 4-4' }],
  send: [
    {
      path: 'M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z',
    },
    { path: 'm21.854 2.147-10.94 10.939' },
  ],
  camera: [
    {
      path: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z',
    },
    { circle: [12, 13, 3] },
  ],
  pencil: [
    {
      path: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z',
    },
    { path: 'm15 5 4 4' },
  ],

  // ── Chevrons (voir DIRECTIONAL : miroir en RTL) ─────────────────────────
  'chevron-down': [{ path: 'm6 9 6 6 6-6' }],
  'chevron-up': [{ path: 'm18 15-6-6-6 6' }],
  'chevron-right': [{ path: 'm9 18 6-6-6-6' }],
  'chevron-left': [{ path: 'm15 18-6-6 6-6' }],

  // ── Statut / confiance ─────────────────────────────────────────────────
  bell: [
    { path: 'M10.268 21a2 2 0 0 0 3.464 0' },
    {
      path: 'M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326',
    },
  ],
  star: [
    {
      path: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z',
    },
  ],
  'circle-alert': [
    { circle: [12, 12, 10] },
    { path: 'M12 8v4' },
    { path: 'M12 16h.01' },
  ],
  // C5.3 — favoris. Trace de lucide-react `heart`, pour rester coherent avec
  // l'icone employee par l'ecran web du meme ecran.
  heart: [
    {
      path: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
    },
  ],
  'shield-check': [
    {
      path: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
    },
    { path: 'm9 12 2 2 4-4' },
  ],
  info: [{ circle: [12, 12, 10] }, { path: 'M12 16v-4' }, { path: 'M12 8h.01' }],
  lock: [
    { rect: [3, 11, 18, 11, 2] },
    { path: 'M7 11V7a5 5 0 0 1 10 0v4' },
  ],

  // ── Métier (colis, véhicule, trajet, argent) ───────────────────────────
  package: [
    {
      path: 'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z',
    },
    { path: 'M12 22V12' },
    { path: 'm3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7' },
    { path: 'm7.5 4.27 9 5.15' },
  ],
  truck: [
    { path: 'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2' },
    { path: 'M15 18H9' },
    {
      path: 'M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14',
    },
    { circle: [17, 18, 2] },
    { circle: [7, 18, 2] },
  ],
  'map-pin': [
    {
      path: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0',
    },
    { circle: [12, 10, 3] },
  ],
  calendar: [
    { path: 'M8 2v4' },
    { path: 'M16 2v4' },
    { rect: [3, 4, 18, 18, 2] },
    { path: 'M3 10h18' },
  ],
  clock: [{ circle: [12, 12, 10] }, { polyline: '12 6 12 12 16 14' }],
  banknote: [
    { rect: [2, 6, 20, 12, 2] },
    { circle: [12, 12, 2] },
    { path: 'M6 12h.01' },
    { path: 'M18 12h.01' },
  ],
  'trending-up': [
    { polyline: '22 7 13.5 15.5 8.5 10.5 2 17' },
    { polyline: '16 7 22 7 22 13' },
  ],
  route: [
    { circle: [6, 19, 3] },
    { path: 'M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15' },
    { circle: [18, 5, 3] },
  ],
  scale: [
    { path: 'm16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1' },
    { path: 'm2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1' },
    { path: 'M7 21h10' },
    { path: 'M12 3v18' },
    { path: 'M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2' },
  ],
  'file-text': [
    { path: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z' },
    { path: 'M14 2v4a2 2 0 0 0 2 2h4' },
    { path: 'M10 9H8' },
    { path: 'M16 13H8' },
    { path: 'M16 17H8' },
  ],
  mail: [
    {
      path: 'M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2z',
    },
    { path: 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7' },
  ],
  phone: [
    {
      path: 'M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384',
    },
  ],
  wrench: [
    {
      path: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
    },
  ],
} as const satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof GLYPHS;

// Glyphes dont le sens dépend du sens de lecture. Le RTL natif
// (I18nManager.forceRTL) retourne les mises en page, jamais le contenu d'un
// SVG : ces glyphes doivent donc être mis en miroir explicitement.
export const DIRECTIONAL: ReadonlySet<string> = new Set<IconName>([
  'chevron-right',
  'chevron-left',
  'send',
]);
