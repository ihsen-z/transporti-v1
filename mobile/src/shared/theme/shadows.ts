import { Platform, type ViewStyle } from 'react-native';

// Ombres de la charte. Multiplateforme : iOS = shadow*, Android = elevation,
// web = box-shadow (via react-native-web).
//
// Sur Android, `elevation` ne sait pas teinter l'ombre avant l'API 28
// (`shadowColor` y est ignoré) : les ombres colorées de la charte — l'orange
// sous le CTA, le bleu sous le hero — y retombent en gris. C'est un écart
// assumé : l'ombre porte le relief, pas l'identité.
function shadow(
  color: string,
  height: number,
  radius: number,
  opacity: number,
  elevation: number,
): ViewStyle {
  return Platform.select({
    android: { elevation, shadowColor: color },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
  }) as ViewStyle;
}

// Transcription directe de la charte : `0 <height>px <radius>px rgba(_, <op>)`.
export const shadows = {
  // --shadow-card : 0 10px 26px rgba(15,29,78,.08). Plus ample et plus douce
  // qu'avant, parce que la carte a perdu sa bordure : c'est désormais l'ombre
  // SEULE qui la détache du fond.
  card: shadow('#0F1D4E', 10, 26, 0.08, 3),
  // --shadow-glass : 0 18px 40px rgba(6,17,54,.28). La plus profonde de la
  // charte — une carte de verre flotte au-dessus du dégradé, elle n'y est pas
  // posée.
  //
  // `elevation: 0` sur Android, et c'est un CORRECTIF, pas un oubli. Mesuré
  // sur Pixel 7 API 35 : une `elevation` sur une vue au fond TRANSLUCIDE fait
  // dessiner par Android un rectangle gris à angles droits sur toute la boîte
  // de contenu — visible à travers le verre, et qui contredit exactement ce
  // que le rayon de 26 cherche à obtenir. Les surfaces opaques (Card, barre
  // d'onglets à 94 %) n'ont pas le défaut et gardent leur `elevation`.
  //
  // La carte ne perd rien d'essentiel : sur Android, sa profondeur vient de
  // l'alpha et du liseré blanc, pas de l'ombre portée. iOS, lui, dessine bien
  // l'ombre de la charte.
  glass: shadow('#061136', 18, 40, 0.28, 0),
  // --shadow-cta : 0 12px 26px rgba(249,115,22,.40)
  cta: shadow('#F97316', 12, 26, 0.4, 6),
  // --shadow-blue : 0 12px 26px rgba(30,58,138,.24)
  brand: shadow('#1E3A8A', 12, 26, 0.24, 6),
  // Bouton flottant : 0 10px 24px rgba(249,115,22,.42) — même famille que le
  // CTA, un ton plus dense parce qu'il flotte plus haut.
  fab: shadow('#F97316', 10, 24, 0.42, 8),
  // Bandeau bleu haut et hero dégradé : une surface, pas une commande.
  hero: shadow('#1E3A8A', 12, 26, 0.24, 10),
} as const;
