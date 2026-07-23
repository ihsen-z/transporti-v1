import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/shared/ui/PlaceholderScreen';

// Onglet CLIENT : funnel « recherche du trajet retour d'abord » (à venir).
export default function SearchScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('screens.search.title')}
      subtitle={t('common.coming_soon')}
      icon="search-outline"
    />
  );
}
