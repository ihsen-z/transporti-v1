import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/icons';
import { useOnBlue } from '@/shared/ui/SurfaceTone';
import { colors, glass, radii, TOUCH_TARGET } from '@/shared/theme';

// Fermeture d'un panneau. Pendant de `BackButton`, et corrige les deux mêmes
// défauts, répétés dans huit panneaux : une croix en `neutral[700]` — donc
// invisible sur un en-tête bleu — et une `Pressable` nue autour d'une icône de
// 26, soit une cible tactile bien en dessous des 44 dp de la charte.
interface Props {
  onPress: () => void;
  testID?: string;
}

export function CloseButton({ onPress, testID = 'close' }: Props) {
  const { t } = useTranslation();
  const onBlue = useOnBlue();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('common.close')}
      style={[
        styles.btn,
        onBlue
          ? { backgroundColor: glass.chip.background, borderColor: glass.chip.border }
          : { backgroundColor: colors.neutral[0], borderColor: colors.neutral[200] },
      ]}
    >
      <Icon
        name="x"
        size={22}
        color={onBlue ? colors.onBlue[100] : colors.neutral[900]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: radii.chip,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
