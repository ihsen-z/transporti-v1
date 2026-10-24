import { StyleSheet, View } from 'react-native';
import { Txt } from '@/shared/ui/Txt';
import { Logo } from '@/shared/ui/Logo';
import { useOnBlue } from '@/shared/ui/SurfaceTone';
import { colors, glass, radii, spacing, fontSize } from '@/shared/theme';

// Bloc de marque des écrans immersifs (charte, §Anatomie) : la marque du logo
// dans une pastille de verre de 38, puis « Transporti » en 18/800.
//
// Il diffère du `wordmark` de `Logo`, où la marque REMPLACE le T de
// « ransporti ». Ce jeu tient sur du blanc, où la marque se lit comme une
// lettre ; sur le dégradé, enfermée dans une pastille, elle redevient un logo
// — et le mot doit alors s'écrire en entier.
export function BrandLockup({ testID }: { testID?: string }) {
  const onBlue = useOnBlue();

  return (
    <View testID={testID} style={styles.row} accessibilityRole="header">
      <View
        style={[
          styles.chip,
          onBlue
            ? { backgroundColor: glass.chip.background, borderColor: glass.chip.border }
            : { backgroundColor: colors.neutral[0], borderColor: colors.neutral[200] },
        ]}
      >
        <Logo size={22} />
      </View>
      <Txt
        style={[
          styles.word,
          { color: onBlue ? colors.onBlue[100] : colors.neutral[900] },
        ]}
      >
        Transporti
      </Txt>
    </View>
  );
}

const CHIP = 38;
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  chip: {
    width: CHIP,
    height: CHIP,
    borderRadius: radii.chip,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: { fontSize: fontSize.brand, fontWeight: '800', letterSpacing: -0.36 },
});
