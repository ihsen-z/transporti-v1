import { I18nManager, Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radii, spacing, fontSize } from '@/shared/theme';
import { setStoredLang } from '@/core/i18n/langStorage';

// Bascule FR <-> AR. Le changement re-render tout l'arbre (via re-key de la
// Stack dans _layout sur 'languageChanged') et persiste le choix.
export function LanguageToggle() {
  const { i18n, t } = useTranslation();

  const onToggle = () => {
    const next = i18n.language === 'ar' ? 'fr' : 'ar';
    setStoredLang(next);
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
