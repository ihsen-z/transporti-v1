import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PublishReturnForm } from '@/features/trips/components/PublishReturnForm';
import { AppScreen } from '@/shared/ui/AppScreen';
import { AppHeader } from '@/shared/ui/AppHeader';
import { BackButton } from '@/shared/ui/BackButton';
import { Card } from '@/shared/ui/Card';
import { Txt } from '@/shared/ui/Txt';
import { colors, fontSize } from '@/shared/theme';

// Onglet TRANSPORTEUR : publication d'un retour. Route mince = composition ;
// la logique vit dans la feature trips (PublishReturnForm).
//
// Le clavier est géré par AppScreen : le formulaire compte une dizaine de
// champs, et cet écran en portait sa propre copie du trio
// SafeAreaView / KeyboardAvoidingView / ScrollView.
export default function PublishScreen() {
  const { t } = useTranslation();

  return (
    <AppScreen
      testID="publish-screen"
      header={
        <AppHeader leading={<BackButton />} title={t('trips.publish.title')}>
          <Txt style={styles.subtitle}>{t('trips.publish.subtitle')}</Txt>
        </AppHeader>
      }
    >
      <Card>
        <PublishReturnForm />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  // Rendu DANS le bandeau bleu.
  subtitle: { fontSize: fontSize.md, lineHeight: fontSize.md * 1.5, color: colors.text.onBlue },
});
