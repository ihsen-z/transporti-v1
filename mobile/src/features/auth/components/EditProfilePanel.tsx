import { useTranslation } from 'react-i18next';
import { FormModalPanel } from '@/shared/ui/FormModalPanel';
import { EditProfileForm } from './EditProfileForm';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Panneau « Modifier le profil », ouvert depuis le Profil. Le formulaire n'est
// monté que lorsque le panneau est ouvert (defaults/état frais à chaque
// ouverture).
export function EditProfilePanel({ visible, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <FormModalPanel visible={visible} title={t('profile.edit_title')} onClose={onClose}>
      {visible ? <EditProfileForm onDone={onClose} /> : null}
    </FormModalPanel>
  );
}
