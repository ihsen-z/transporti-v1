import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChatView } from '@/features/messaging/components/ChatView';
import { AppScreen } from '@/shared/ui/AppScreen';
import { AppHeader } from '@/shared/ui/AppHeader';
import { BackButton } from '@/shared/ui/BackButton';
import { RouteUnavailable } from '@/shared/ui/RouteUnavailable';

// Fil d'une conversation — adressable (4.5), atteignable depuis la liste, une
// notification (4.7) ou un futur tap de push (4.8). `title` est un paramètre
// optionnel transmis par la liste (déjà en mémoire, pas d'aller-retour réseau
// supplémentaire) ; sans lui (arrivée directe par jobId) on retombe sur le
// libellé générique de l'onglet.
export default function ConversationScreen() {
  const { t } = useTranslation();
  const { jobId, title } = useLocalSearchParams<{ jobId: string; title?: string }>();
  const numericJobId = Number(jobId);
  const valid = Number.isFinite(numericJobId) && numericJobId > 0;

  return (
    // `scroll={false}` : le fil défile lui-même et doit rester collé au bas de
    // l'écran quand le clavier s'ouvre.
    <AppScreen
      testID="conversation-screen"
      scroll={false}
      header={
        <AppHeader
          leading={<BackButton testID="messages-detail-back" fallback="/messages" />}
          title={title || t('tabs.messages')}
        />
      }
    >
      {/* 7.6 — un identifiant invalide rendait l'en-tete puis `null` : un
          ecran vide, sans message ni sortie, atteignable d'un tap de
          notification. */}
      {valid ? <ChatView jobId={numericJobId} /> : <RouteUnavailable />}
    </AppScreen>
  );
}
