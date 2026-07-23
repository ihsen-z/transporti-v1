import { useTranslation } from 'react-i18next';
import { PlaceholderScreen } from '@/shared/ui/PlaceholderScreen';

// Onglet Messages (les deux rôles) : conversations par job (polling) — à venir.
export default function MessagesScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('screens.messages.title')}
      subtitle={t('common.coming_soon')}
      icon="chatbubbles-outline"
    />
  );
}
