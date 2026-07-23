import { I18nManager, Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radii, spacing, fontSize } from '@/shared/theme';

// Bascule FR <-> AR. Le texte change immédiatement (i18n). Le sens RTL/LTR
// complet du layout s'applique au prochain lancement (I18nManager.forceRTL) :
// l'écran de réglages S1 déclenchera un vrai reload.
export function LanguageToggle() {
  const { i18n, t } = useTranslation();

  const onToggle = () => {
    const next = i18n.language === 'ar' ? 'fr' : 'ar';
    void i18n.changeLanguage(next);
    I18nManager.forceRTL(next === 'ar');
  };

  return (
    <Pressable onPress={onToggle} style={styles.btn} accessibilityRole="button">
      <Text style={styles.txt}>{t('lang.toggle')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.brand[500],
  },
  txt: {
    color: colors.brand[500],
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
