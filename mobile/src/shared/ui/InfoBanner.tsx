import { StyleSheet, View } from 'react-native';
import { Txt } from '@/shared/ui/Txt';
import { useOnBlue } from '@/shared/ui/SurfaceTone';
import { colors, glass, radii, spacing, fontSize } from '@/shared/theme';

// Bandeau d'information de la charte : un point coloré à gauche, une phrase.
// Sur fond clair il est bleu pâle ; sur le bleu il devient du verre discret et
// son point passe au vert — le bleu sur bleu ne se verrait pas.
export function InfoBanner({ children, testID }: { children: string; testID?: string }) {
  const onBlue = useOnBlue();

  return (
    <View
      testID={testID}
      style={[styles.banner, { backgroundColor: onBlue ? glass.muted : colors.info.bg }]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: onBlue ? colors.green[500] : colors.brand[500] },
        ]}
      />
      <Txt
        style={[styles.text, { color: onBlue ? colors.text.onBlue : colors.info.ink }]}
      >
        {children}
      </Txt>
    </View>
  );
}

// Charte : rayon 18, padding 15–16, point 8 px, texte 13/1,5.
const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: 18,
    padding: 15,
  },
  // `marginTop` cale le point sur la PREMIÈRE ligne de texte : sans lui, un
  // message sur deux lignes le laisse flotter au-dessus du bloc.
  dot: { width: 8, height: 8, borderRadius: radii.full, marginTop: 5 },
  text: { flex: 1, fontSize: fontSize.sm, lineHeight: 19.5 },
});
