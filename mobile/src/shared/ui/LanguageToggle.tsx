import { I18nManager, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { colors, radii, spacing, fontSize } from '@/shared/theme';
import { setStoredLang } from '@/core/i18n/langStorage';
import { reloadApp } from '@/core/reloadApp';

// Bascule FR <-> AR. Persiste le choix, met à jour i18n, puis — si le SENS
// (LTR/RTL) change — force le RTL natif et redémarre l'app : c'est la seule
// façon de faire rebasculer le layout natif (Yoga). Comme la langue est
// persistée (langStorage), l'app repart directement dans le bon sens.
export function LanguageToggle() {
  const { i18n, t } = useTranslation();

  const onToggle = () => {
    const next = i18n.language === 'ar' ? 'fr' : 'ar';
    const nextRTL = next === 'ar';
    setStoredLang(next);
    void i18n.changeLanguage(next);
    if (I18nManager.isRTL !== nextRTL) {
      I18nManager.forceRTL(nextRTL);
      reloadApp();
    }
  };

  return (
    <Pressable onPress={onToggle} style={styles.btn} accessibilityRole="button">
      <Txt style={styles.txt}>{t('lang.toggle')}</Txt>
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
