import { useTranslation } from 'react-i18next';
import { FormModalPanel } from '@/shared/ui/FormModalPanel';
import { ChangePasswordForm } from './ChangePasswordForm';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Panneau « Changer le mot de passe », ouvert depuis le Profil. Le formulaire
// n'est monté qu'à l'ouverture (état frais).
export function ChangePasswordPanel({ visible, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <FormModalPanel visible={visible} title={t('profile.change_password_title')} onClose={onClose}>
      {visible ? <ChangePasswordForm onDone={onClose} /> : null}
    </FormModalPanel>
  );
}
