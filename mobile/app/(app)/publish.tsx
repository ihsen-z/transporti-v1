import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/shared/ui/PlaceholderScreen';

// Onglet TRANSPORTEUR : publication d'un retour (prix net D1) — à venir.
export default function PublishScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('screens.publish.title')}
      subtitle={t('common.coming_soon')}
      icon="add-circle-outline"
    />
  );
}
