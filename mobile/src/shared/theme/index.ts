// Tokens de design partagés. Un seul point d'import : `@/shared/theme`.
import { colors } from './colors';

export { colors, gradients } from './colors';
export { shadows } from './shadows';
export { glass, halos } from './glass';

// Espacements (échelle 4pt).
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16, // gap vertical entre blocs, famille applicative
  xl: 24, // gap vertical entre blocs, famille immersive
  '2xl': 32,
} as const;

// Marge latérale d'un écran. La charte l'écrit « padding: 0 20–22px » — une
// fourchette, pas une valeur : 20 est le bas de la fourchette, et c'est celui
// qui aligne la colonne sur l'échelle 4pt.
export const SCREEN_PADDING = 20;

// Rayons. Source canonique : la charte « verre & lumière », §Rayons.
export const radii = {
  tag: 8, // tag / badge carré
  md: 8,
  lg: 12,
  chip: 13, // pastille icône
  input: 14, // champs
  buttonSm: 12,
  cta: 16, // bouton CTA
  fab: 19, // bouton flottant orange 58×58 — carré arrondi, pas un cercle
  tile: 16, // petite carte, tuile de statistique
  tabbar: 20,
  card: 22, // carte blanche opaque, famille applicative
  glass: 26, // carte de verre, famille immersive
  hero: 26, // hero dégradé : c'est une carte de verre qui a un fond
  sheet: 30, // coins hauts des panneaux modaux (feuilles remontantes)
  header: 34, // coins bas du bandeau bleu, famille applicative
  full: 9999,
} as const;

// Le bandeau bleu de la famille applicative. La maquette le dessine en 300 sur
// un écran de 772, et la charte donne une fourchette de 190 à 300 : sa hauteur
// suit donc son CONTENU, avec un plancher.
//
// `BANNER_OVERLAP` est ce que le bandeau descend SOUS l'en-tête. C'est lui qui
// fait mordre la première carte du contenu sur le bleu — le chevauchement que
// la charte appelle sa signature : « la carte commence dans le bleu et descend
// sur le fond clair ».
export const BANNER_MIN = 190;
export const BANNER_OVERLAP = 56;

// Cible tactile minimale. Exigence écrite de la charte : « Cibles ≥ 44 px ».
export const TOUCH_TARGET = 44;

// Hauteur d'un champ et d'un CTA. La charte les fige (champ 52, CTA 56) parce
// que c'est ce qui donne aux formulaires leur rythme : trois champs et un
// bouton doivent tomber juste, quelle que soit la police système.
export const FIELD_HEIGHT = 52;
export const CTA_HEIGHT = 56;

// Anneau de focus des champs sur fond CLAIR — traduction de
// `box-shadow: 0 0 0 4px rgba(30,58,138,0.08)`. RN n'a pas de `spread`
// d'ombre : les champs dessinent cet anneau avec une vue absolue en retrait
// négatif (voir TextField), ce qui évite tout décalage de mise en page à la
// prise de focus. Sur fond bleu il n'y a pas d'anneau — le verre change
// d'opacité, voir `glass.fieldFocus`.
export const focusRing = {
  width: 4,
  color: colors.brand[50],
  borderColor: colors.brand[600],
} as const;

// Tailles de police. La charte pose un plancher : « Jamais sous 11px ».
export const fontSize = {
  xs: 11, // libellé de navigation basse
  meta: 11.5, // métadonnées, tags, légendes
  tag: 11.5,
  label: 12.5, // libellé de champ
  sm: 13,
  base: 14, // libellé de bouton secondaire
  md: 15, // corps de texte / champs
  stat: 16, // valeur de KPI
  cta: 16.5, // libellé du bouton CTA
  lg: 17, // titre de carte / nom
  brand: 18, // mot-symbole du bloc de marque
  title: 20, // titre du bandeau bleu, famille applicative
  xl: 22,
  price: 23, // prix courant d'une carte de trajet
  '2xl': 28, // titre d'écran immersif
  hero: 34, // chiffre héro : revenus, total
} as const;

// Interlettrage. La charte serre les gros caractères et laisse le corps de
// texte au naturel — c'est ce qui distingue un chiffre héro d'un gros chiffre.
export const tracking = {
  hero: -0.03 * 34, // -1.02 : titres d'écran et chiffres héro
  title: -0.02 * 20, // -0.4 : titres de bandeau et prix
  none: 0,
} as const;

// Durées d'animation (§Interactions de la charte). Les halos ne figurent pas
// ici : la charte les veut STATIQUES, « ne pas animer (coût GPU sur mobile) ».
export const motion = {
  press: 120,
  focus: 150,
  listItem: 180,
  listStagger: 40,
  sheet: 260,
} as const;
