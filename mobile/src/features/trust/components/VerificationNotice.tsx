import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InfoBanner } from '@/shared/ui/InfoBanner';
import { spacing } from '@/shared/theme';
import { KycRequiredLink } from './KycRequiredLink';

// Bandeau préventif : le transporteur apprend AVANT de remplir le formulaire
// que le serveur refusera la publication tant que ses pièces ne sont pas
// validées.
export function VerificationNotice() {
  const { t } = useTranslation();
  return (
    <View style={{ gap: spacing.sm }}>
      <InfoBanner testID="publish-verification-notice">{t('trust.notice_publish')}</InfoBanner>
      <KycRequiredLink testID="publish-verification-open" />
    </View>
  );
}
