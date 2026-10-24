import { StyleSheet, View, type ViewProps } from 'react-native';
import { glass, radii, shadows } from '@/shared/theme';

// Carte de verre : la surface principale d'un écran immersif.
//
// Elle n'a de sens QUE sur le dégradé bleu. Posée sur `neutral[50]`, un blanc
// à 14 % ne se voit pas — c'est pour ça que la charte impose des cartes
// blanches opaques (`Card`) dès qu'on quitte le bleu, et pas une variante
// « verre clair » qui n'existerait qu'à moitié.
export function GlassCard({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  // Charte (.glass) : rayon 26, padding 22/20, bordure blanche à 28 %.
  card: {
    backgroundColor: glass.card.background,
    borderRadius: radii.glass,
    borderWidth: 1,
    borderColor: glass.card.border,
    paddingVertical: 22,
    paddingHorizontal: 20,
    ...shadows.glass,
  },
});
