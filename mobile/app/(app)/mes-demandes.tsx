import { useState } from 'react';
import { useTabBarClearance } from '@/shared/ui/FloatingTabBar';
import { useTranslation } from 'react-i18next';
import { AppScreen } from '@/shared/ui/AppScreen';
import { AppHeader } from '@/shared/ui/AppHeader';
import { MyRequestsList } from '@/features/my-requests/components/MyRequestsList';
import { MyRequestsTabs } from '@/features/my-requests/components/MyRequestsTabs';
import { useMyRequests } from '@/features/my-requests/api/useMyRequests';
import {
  compterParOnglet,
  type OngletDemande,
} from '@/features/my-requests/model/onglets';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';

// Onglet CLIENT dédié au suivi des demandes envoyées. Auparavant une simple
// section noyée en bas de l'Accueil, sans pull-to-refresh ni existence propre
// dans la barre de navigation.
//
// C2.1 — les demandes sont désormais triées par QUI DOIT AGIR et non par date :
// une contre-proposition qui attend la décision du client ne doit pas se perdre
// sous des demandes closes.
export default function MesDemandesScreen() {
  // Marge basse reservee sous le contenu : sans elle, le dernier element reste
  // sous la barre de navigation et son action devient inatteignable (defaut
  // mesure sur l'inventaire des retours, recette du 03/09).
  const margeBasse = useTabBarClearance();
  const { t } = useTranslation();
  // Même queryKey que MyRequestsList (React Query dédoublonne) : ce qui donne
  // le pull-to-refresh à l'écran est aussi ce que la liste affiche.
  const requests = useMyRequests();
  const [onglet, setOnglet] = useState<OngletDemande>('attente');

  const compteurs = compterParOnglet(requests.data ?? []);

  return (
    <AppScreen
      testID="mes-demandes-screen"
      header={<AppHeader title={t('my_requests.title')} />}
      refreshControl={queryRefreshControl(requests)}
      contentPaddingBottom={margeBasse}
    >
      <MyRequestsTabs actif={onglet} compteurs={compteurs} onSelect={setOnglet} />
      <MyRequestsList onglet={onglet} />
    </AppScreen>
  );
}
