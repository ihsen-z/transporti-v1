import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';

// Bouton vers l'écran de vérification (le panneau « Vérification » du profil).
// Utilisé sous un refus `KYC_REQUIRED` et sous le bandeau préventif de la
// publication. Le paramètre `verification` fait ouvrir le panneau à l'arrivée.
export function KycRequiredLink({ testID }: { testID: string }) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Button
      testID={testID}
      label={t('trust.open_verification')}
      onPress={() => router.push({ pathname: '/profile', params: { verification: '1' } })}
      variant="ghost"
      size="sm"
    />
  );
}
