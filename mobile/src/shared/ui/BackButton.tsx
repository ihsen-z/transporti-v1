import { Pressable, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/icons';
import { useOnBlue } from '@/shared/ui/SurfaceTone';
import { colors, glass, radii, TOUCH_TARGET } from '@/shared/theme';

// Retour arrière des écrans de détail. Cinq écrans en portaient chacun leur
// copie, toutes codées en `neutral[900]` — donc invisibles depuis que le
// bandeau du haut est bleu.
//
// `canGoBack()` avant `back()` : ces écrans sont adressables par deep link et
// par notification. Ouverts ainsi, ils n'ont PAS d'historique, et un `back()`
// sec ne fait rien — l'utilisateur reste coincé sur un détail sans sortie.
// `fallback` dit alors où aller.
interface Props {
  /** Route de repli quand il n'y a rien à dépiler. */
  fallback?: Href;
  testID?: string;
}

export function BackButton({ fallback = '/home', testID = 'back' }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const onBlue = useOnBlue();

  return (
    <Pressable
      testID={testID}
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(fallback);
      }}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      style={[
        styles.btn,
        onBlue
          ? { backgroundColor: glass.chip.background, borderColor: glass.chip.border }
          : { backgroundColor: colors.neutral[0], borderColor: colors.neutral[200] },
      ]}
    >
      <Icon
        name="chevron-left"
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
