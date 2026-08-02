import { StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { FormModalPanel } from '@/shared/ui/FormModalPanel';
import { Logo } from '@/shared/ui/Logo';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize, radii } from '@/shared/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Panneau « À propos » : identité de marque, version de l'app et description.
export function AboutPanel({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <FormModalPanel visible={visible} title={t('about.title')} onClose={onClose}>
      {visible ? (
        <View style={styles.wrap}>
          <Logo wordmark size={44} />
          <Txt style={styles.tagline}>{t('app.tagline')}</Txt>

          <View style={styles.versionRow}>
            <Txt style={styles.versionLabel}>{t('about.version')}</Txt>
            <Txt style={styles.versionValue}>{version}</Txt>
          </View>

          <Txt style={styles.desc}>{t('about.description')}</Txt>
          <Txt style={styles.copyright}>{t('about.copyright')}</Txt>
        </View>
      ) : null}
    </FormModalPanel>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg, paddingTop: spacing.md },
  tagline: { fontSize: fontSize.md, color: colors.neutral[500] },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[0],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  versionLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.neutral[700] },
  versionValue: { fontSize: fontSize.md, fontWeight: '800', color: colors.brand[600] },
  desc: { fontSize: fontSize.md, color: colors.neutral[700], lineHeight: 24 },
  copyright: { fontSize: fontSize.sm, color: colors.neutral[400] },
});
