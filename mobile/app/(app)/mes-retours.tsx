import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppScreen } from '@/shared/ui/AppScreen';
import { AppHeader } from '@/shared/ui/AppHeader';
import { BackButton } from '@/shared/ui/BackButton';
import { Txt } from '@/shared/ui/Txt';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { showToast } from '@/shared/ui/toastStore';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { colors, spacing, fontSize } from '@/shared/theme';
import { ReturnTripRow } from '@/features/trips/components/ReturnTripRow';
import {
  useDuplicateReturnTrip,
  useExtendReturnTrip,
  useMyReturnTrips,
  useUnpublishReturnTrip,
} from '@/features/trips/api/useMyReturnTrips';
import type { ReturnTripDto } from '@/features/trips/api/dto';

/**
 * T1.3 — Mes retours publiés, l'inventaire du transporteur.
 *
 * Pendant mobile de `frontend/app/(app)/retours/page.tsx`.
 *
 * Écran hors barre d'onglets (`href: null`) : la charte impose 4 onglets plus
 * le bouton central, et un cinquième casserait cette mise en page. L'inventaire
 * est donc atteint depuis l'écran de publication et depuis l'Accueil — ce qui
 * correspond au parcours réel, puisqu'on y vient après avoir publié.
 */
export default function MesRetoursScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const trajets = useMyReturnTrips();
  const prolonger = useExtendReturnTrip();
  const dupliquer = useDuplicateReturnTrip();
  const depublier = useUnpublishReturnTrip();

  const [enCours, setEnCours] = useState<number | null>(null);

  const executer = async (trajet: ReturnTripDto, action: () => Promise<unknown>) => {
    setEnCours(trajet.id);
    try {
      await action();
    } catch {
      // `showToast` et non `Alert.alert` : c'est la convention de tous les
      // autres ecrans, et cet ecran etait le seul a en sortir.
      showToast(t('trips.inventory.action_failed'));
    } finally {
      setEnCours(null);
    }
  };

  // Dépublier rejette et notifie les demandes en attente : la conséquence est
  // annoncée avant, pas découverte après.
  const confirmerDepublication = (trajet: ReturnTripDto) => {
    // Ici l'Alert est volontaire : une action destructive doit bloquer et
    // annoncer ses consequences, pas glisser dans un toast.
    Alert.alert(
      t('trips.inventory.unpublish_title'),
      t('trips.inventory.unpublish_message', {
        from: trajet.pickup_governorate,
        to: trajet.dropoff_governorate,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('trips.inventory.unpublish'),
          style: 'destructive',
          onPress: () =>
            void executer(trajet, () => depublier.mutateAsync(trajet.id)),
        },
      ],
    );
  };

  const liste: ReturnTripDto[] = trajets.data ?? [];

  return (
    // E-11 — la zone sûre est désormais portée par AppHeader : sans elle, le
    // titre se superposait à l'horloge système.
    <AppScreen
      testID="mes-retours-screen"
      header={
        <AppHeader leading={<BackButton />} title={t('trips.inventory.title')}>
          <Txt style={styles.sousTitre}>{t('trips.inventory.subtitle')}</Txt>
        </AppHeader>
      }
      refreshControl={queryRefreshControl(trajets)}
    >
      {trajets.isPending && <Txt style={styles.info}>{t('common.loading')}</Txt>}

      {trajets.isError && (
        <Card style={styles.bloc}>
          <Txt style={styles.info}>{t('trips.inventory.load_error')}</Txt>
          <Button
            label={t('common.retry')}
            onPress={() => void trajets.refetch()}
            variant="ghost"
          />
        </Card>
      )}

      {/* État vide : jamais un cul-de-sac (IA-3). Publier est la seule action
          évidente à ce stade, donc la seule proposée. */}
      {!trajets.isPending && !trajets.isError && liste.length === 0 && (
        <EmptyState
          testID="retours-vide"
          icon="package"
          title={t('trips.inventory.empty_title')}
          subtitle={t('trips.inventory.empty_hint')}
          ctaLabel={t('trips.inventory.publish_first')}
          onCta={() => router.push('/publish')}
        />
      )}

      {liste.length > 0 && (
        <View style={styles.liste} testID="retours-liste">
          {liste.map((trajet) => (
            <ReturnTripRow
              key={trajet.id}
              trajet={trajet}
              enCours={enCours === trajet.id}
              onProlonger={(tr: ReturnTripDto) =>
                void executer(tr, () => prolonger.mutateAsync({ trajet: tr }))
              }
              onDupliquer={(tr: ReturnTripDto) =>
                void executer(tr, () => dupliquer.mutateAsync({ trajet: tr }))
              }
              onDepublier={confirmerDepublication}
            />
          ))}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  // Rendu DANS le bandeau bleu.
  sousTitre: { fontSize: fontSize.sm, lineHeight: 19.5, color: colors.text.onBlue },
  info: { fontSize: fontSize.md, color: colors.neutral[500] },
  bloc: { gap: spacing.md, alignItems: 'center' },
  liste: { gap: spacing.md },
});
