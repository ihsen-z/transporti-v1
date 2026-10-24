import { Linking, Pressable, StyleSheet } from 'react-native';
import { Icon, type IconName } from '@/shared/ui/icons';
import { Txt } from '@/shared/ui/Txt';
import { showToast } from '@/shared/ui/toastStore';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, TOUCH_TARGET } from '@/shared/theme';

interface Props {
  /** URL à ouvrir. Vide ou absente => la ligne ne se rend pas du tout. */
  url: string;
  label: string;
  icon: IconName;
  testID?: string;
}

/**
 * Entrée de menu ouvrant une page hébergée hors de l'application (CGU,
 * confidentialité, aide).
 *
 * Deux règles portées ici plutôt que dupliquées dans chaque appelant :
 *
 * 1. **Pas d'URL, pas de ligne.** Un lien légal mort est pire que son absence
 *    dans une revue de store, et laisse l'utilisateur croire à une panne.
 * 2. **Un échec d'ouverture se dit.** `openURL` rejette quand aucun
 *    navigateur ne peut prendre l'intention ; sans message, le tap paraît
 *    simplement ignoré.
 */
export function ExternalLinkRow({ url, label, icon, testID }: Props) {
  const { t } = useTranslation();
  if (!url) return null;

  const ouvrir = () => {
    void Linking.openURL(url).catch(() => showToast(t('profile.link_failed')));
  };

  return (
    <Pressable
      testID={testID}
      style={styles.link}
      onPress={ouvrir}
      accessibilityRole="link"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={22} color={colors.brand[600]} />
      <Txt style={styles.linkText}>{label}</Txt>
      <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Même métrique que les entrées de `profile.tsx`, plus le minimum tactile
  // de la charte (44 dp) rendu explicite.
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: TOUCH_TARGET,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  linkText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.neutral[900],
  },
});
