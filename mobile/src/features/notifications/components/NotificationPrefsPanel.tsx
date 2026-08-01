import { useTranslation } from 'react-i18next';
import { FormModalPanel } from '@/shared/ui/FormModalPanel';
import { NotificationPrefsForm } from './NotificationPrefsForm';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Panneau « Notifications », ouvert depuis le Profil. Le formulaire n'est monté
// qu'à l'ouverture (recharge les préférences à chaque fois).
export function NotificationPrefsPanel({ visible, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <FormModalPanel visible={visible} title={t('notif_prefs.title')} onClose={onClose}>
      {visible ? <NotificationPrefsForm onDone={onClose} /> : null}
    </FormModalPanel>
  );
}
